import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';
import md5 from 'md5';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const port = 80;


// Set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://10.2.54.89');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Prevent 404 errors for favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Serve static files from the public directory
app.use(express.static('public'));

// IP lookup endpoint
app.get('/get-ip', (req, res) => {
    // Try to get IP from request headers
    const ip = req.headers['x-forwarded-for'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               req.connection.socket.remoteAddress;
    
    // Return the IP address
    res.json({ ip: ip ? ip.split(',')[0] : 'unknown' });
});

// Visitor tracking endpoint
app.post('/log-visitor', (req, res) => {
    const visitorData = req.body;
    
    // Read existing visitor data
    const visitorPath = path.join(__dirname, 'visitorLogin.json');
    let visitors = [];
    try {
        visitors = JSON.parse(fs.readFileSync(visitorPath));
    } catch (err) {
        console.error('Error reading visitor data:', err);
    }

    // Add new visitor data at the beginning of the array
    visitors.unshift(visitorData);

    // Save updated data
    try {
        fs.writeFileSync(visitorPath, JSON.stringify(visitors, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving visitor data:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Serve JSON files
app.get('/login.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.json'));
});

app.get('/medtest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'medtest.json'));
});

app.get('/scores.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'scores.json'));
});


// Load data files
const loginPath = path.join(__dirname, 'login.json');
const medtestPath = path.join(__dirname, 'medtest.json');
const scoresPath = path.join(__dirname, 'scores.json');

let loginData = {};
let medtestData = {};
let scoresData = {};

try {
  loginData = JSON.parse(fs.readFileSync(loginPath));
  medtestData = JSON.parse(fs.readFileSync(medtestPath));
  scoresData = JSON.parse(fs.readFileSync(scoresPath));

} catch (err) {
  console.error('Error loading data files:', err);
}

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = loginData.users.find(u => u.email === email);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid email-user' });
    }

    const hashedPassword = md5(password);
    if (hashedPassword !== user.password) {
        return res.status(401).json({ message: 'Invalid password:' });
    }

    console.log("USER:"+user.name)
    res.json({
        message: 'Login successful',
        role: user.role,
        dept: user.dept,
        name: user.name
    });
    //console.log(res)
    console.log(user)
});

// Dashboard routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/admin/questions', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'questions.html'));
});

app.get('/reviewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reviewer.html'));
});

app.get('/evalQuestion', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'evalQuestion.html'));
});

app.get('/evalAnswer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'evalAnswer.html'));
});

app.get('/designer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'designer.html'));
});

// API Routes
app.get('/api/question-groups', (req, res) => {
    res.json(medtestData.questionGroups);
});

app.get('/api/questions', (req, res) => {
    const group = req.query.group ? req.query.group.toLowerCase() : undefined;
    const groupData = medtestData.questionGroups.find(g =>
        g.dept.toLowerCase() === group
    );
    
    if (groupData) {
        res.json(groupData.questions);
    } else {
        // Return general questions if department-specific questions not found
        const generalGroup = medtestData.questionGroups.find(g =>
            g.dept.toLowerCase() === '全科'
        );
        
        if (generalGroup) {
            res.json(generalGroup.questions);
        } else {
            res.status(404).json({
                message: 'No questions found for this department'
            });
        }
    }
});

app.post('/api/questions', (req, res) => {
    const { group, text, type, answer} = req.body;
    const groupData = medtestData.questionGroups.find(g => g.dept === group);
    
    if (groupData) {
        const code = generateQuestionCode();
        groupData.questions.push({
            QID: code,
            text: text,
            type: type,
            answer: answer,
            assessments: {}
        });
        saveMedtestData();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Group not found' });
    }
});

app.put('/api/questions', (req, res) => {
    const { group, id, text, type } = req.body;
    const groupData = medtestData.questionGroups.find(g => g.dept === group);
    
    if (groupData) {
        const question = groupData.questions.find(q => q.QID === id);
        if (question) {
            question.text = text;
            question.type = type;
            saveMedtestData();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Question not found' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Group not found' });
    }
});

// Save assessment
app.post('/api/save-assessment', (req, res) => {
    const { QID, department, assessment } = req.body;
    
    // Load existing scores
    const scoresPath = path.join(__dirname, 'scores.json');
    let scores = {};
    try {
        scores = JSON.parse(fs.readFileSync(scoresPath));
    } catch (err) {
        console.error('Error reading scores:', err);
    }

    // Update or create assessment
    if (!scores[QID]) {
        scores[QID] = {
            QID,
            department,
            assessments: {}
        };
    }
    
    scores[QID].assessments = {
        ...scores[QID].assessments,
        ...assessment
    };

    // Save updated scores
    try {
        fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving scores:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/questions', (req, res) => {
    const { group, id } = req.body;
    const groupData = medtestData.questionGroups.find(g => g.dept === group);
    
    if (groupData) {
        const questionIndex = groupData.questions.findIndex(q => q.QID === id);
        if (questionIndex !== -1) {
            groupData.questions.splice(questionIndex, 1);
            saveMedtestData();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Question not found' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Group not found' });
    }
});

// Helper function to save data
function generateQuestionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function saveMedtestData() {
    fs.writeFileSync(medtestPath, JSON.stringify(medtestData, null, 2));
}

// Assessment API
app.post('/api/assessments', (req, res) => {
    const { dept, questionId, difficulty, diagnosis, treatment, procedure, rareDisease, user, comment } = req.body;
    
    // Find the department group
    const groupData = medtestData.questionGroups.find(g => g.dept === dept);
    
    if (groupData) {
        // Find the question by QID
        const question = groupData.questions.find(q => q.QID === questionId);
        
        if (question) {
            // Initialize assessments object if it doesn't exist
            if (!question.assessments) {
                question.assessments = {};
            }
            
            // Save assessment data
            question.assessments[user] = {
                difficulty: difficulty,
                diagnosis: diagnosis,
                treatment: treatment,
                procedure: procedure,
                rareDisease: rareDisease,
                comment: comment,
                timestamp: new Date().toISOString()
            };
            
            // Save updated data
            saveMedtestData();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Question not found' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Department not found' });
    }
});

// Session management
const sessions = {};

// Current user API
app.get('/api/current-user', (req, res) => {
    console.log('Received cookies:', req.cookies);
    const sessionId = req.cookies && req.cookies.sessionId;
    
    if (!sessionId || !sessions[sessionId]) {
        console.log('No valid session found. Available sessions:', Object.keys(sessions));
        return res.status(401).json({ message: 'Unauthorized: No session' });
    }

    const session = sessions[sessionId];
    console.log('Found session:', session);
    
    // Check session expiration
    if (session.expires < Date.now()) {
        delete sessions[sessionId];
        console.log('Session expired for:', session.email);
        return res.status(401).json({ message: 'Session expired' });
    }

    const userEmail = session.email;
    console.log('Valid session for:', userEmail, 'Expires:', new Date(session.expires));
    const user = loginData.users.find(u => u.email === userEmail);
    
    if (user) {
        res.json({
            email: user.email,
            department: user.dept,
            name: user.name
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Update login route to create session
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = loginData.users.find(u => u.email === email);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const hashedPassword = md5(password);
    if (hashedPassword !== user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create session
    const sessionId = createSession(email);
    
    // Set cookie with secure options
    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: false, // Allow cookies over HTTP for development
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
        path: '/'
    });
    
    // Return user data needed for frontend
    res.json({
        message: 'Login successful',
        role: user.role,
        department: user.dept,
        name: user.name,
        email: user.email
    });
});

// Logout route
app.post('/logout', (req, res) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
        delete sessions[sessionId];
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Logged out successfully' });
});

app.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Save scores endpoint
app.post('/api/save-scores', (req, res) => {
    const { qid, model, user, name, strength, hallucination, halluText} = req.body;
    
    const scoresPath = path.join(__dirname, 'scores.json');
    let scores = {};
    try {
        scores = JSON.parse(fs.readFileSync(scoresPath));
    } catch (err) {
        console.error('Error reading scores:', err);
    }

    // Initialize if needed
    if (!scores[qid]) scores[qid] = {};
    if (!scores[qid][model]) scores[qid][model] = [];
    
    // Find or create user entry
    let userEntry = scores[qid][model].find(entry => entry.email === user);
    if (!userEntry) {
        userEntry = {
            user: name,
            email: user,
            strength: null,
            hallucination: null,
            halluText: null
        };
        scores[qid][model].push(userEntry);
    }
    
    // Update ratings
    if (strength !== undefined) userEntry.strength = strength;
    if (hallucination !== undefined) userEntry.hallucination = hallucination;
    if (halluText !== undefined) userEntry.halluText = halluText;
    // Save updated scores
    try {
        fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving scores:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Scores API endpoint
app.get('/api/scores', async (req, res) => {
    const { qid, model } = req.query;

    if (!qid || !model) {
        return res.status(400).json({ error: 'QID and model are required' });
    }

    const scoresPath = path.join(__dirname, 'scores.json');
    let scores = {};
    try {
        scores = JSON.parse(fs.readFileSync(scoresPath));
    } catch (err) {
        console.error('Error reading scores:', err);
        return res.status(500).json({ error: 'Failed to load scores' });
    }

    if (scores[qid] && scores[qid][model]) {
        return res.json(scores[qid][model]);
    } else {
        return res.json([]);
    }
});

// Answers API endpoint
app.get('/api/answers', (req, res) => {
    const qid = req.query.qid;
    const answersPath = path.join(__dirname, 'answers.json');
    
    try {
        const answers = JSON.parse(fs.readFileSync(answersPath));
        
        if (qid) {
            const filteredAnswers = answers.filter(a => a.qid === qid);
            res.json(filteredAnswers);
        } else {
            res.json(answers);
        }
    } catch (err) {
        console.error('Error reading answers:', err);
        res.status(500).json({ error: 'Failed to load answers' });
    }
});

// Start server
app.listen(80, '0.0.0.0', () => {
   console.log(`Server running at http://8.134.62.111:80`);
});
