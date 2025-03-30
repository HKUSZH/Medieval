// Initialize variables
let currentQuestionIndex = 0;
let questionsData = [];
let answersData = [];

// DOM Elements
const questionContainer = document.getElementById('answerAccordion');
const prevButton = document.getElementById('prevQuestion');
const nextButton = document.getElementById('nextQuestion');
const currentQuestionNumber = document.getElementById('currentQuestionNumber');
const totalQuestions = document.getElementById('totalQuestions');

// Show rules modal if coming from reviewer page
document.addEventListener('DOMContentLoaded', function() {
    // Automatic modal display
    const referrer = document.referrer.toLowerCase();
    if (referrer.includes('reviewer') || referrer.includes('reviewer.html')) {
        const rulesModal = new bootstrap.Modal(document.getElementById('rulesModal'), {
            backdrop: 'static',
            keyboard: false
        });
        // rulesModal.show();
    }

    // Manual modal button
    const showRulesBtn = document.getElementById('showRulesBtn');
    if (showRulesBtn) {
        showRulesBtn.addEventListener('click', () => {
            const rulesModal = new bootstrap.Modal(document.getElementById('rulesModal'), {
                backdrop: 'static',
                keyboard: false
            });
            rulesModal.show();
        });
    }
});

// Load initial data
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        if (!email) {
            throw new Error('No email parameter found in URL');
        }

        // Fetch login data to get user details
        const loginResponse = await fetch('../login.json');
        const loginData = await loginResponse.json();
        const user = loginData.users.find(u => u.email === email);
        if (!user) {
            throw new Error('User not found in login data');
        }
        deptEng={'急诊':"01.AE", '心内科':"02.Cardio", '心外科':"03.CardioSurg", '神内科':"04.Neural", 
            '肾内科':"05.Nephro", '骨科':"06.Ortho", 'ICU重症':"07.ICU", '儿科':"08.Pedi", '产前诊断':"09.Prenatal", 
            '新生儿科':"10.Neonatal", '呼吸内科':"11.Resp", '小儿外科': "12.PediSurg", '罕见病':"13.Rare", '急诊抢救室':"01b.AEq20"}
        department=deptEng[user.dept]
        console.log("department:"+department)
        deptFile = "deptJsons/deptAnswers."+department+".json"
        console.log("deptFile:"+deptFile)
        deptFile_shuffled = "deptJsons/deptAnswers."+department+"_shuffled.json"
        console.log("deptFile_shuffled:"+deptFile_shuffled)

        // Set user info
        currentUser = user.email;
        department = user.dept || 'General';
        profilePic = user.pic;
        examiner = user.designer;


        // Load reviewer info
        document.getElementById('reviewerName').textContent = user.name;
        document.getElementById('reviewerEmail').textContent = user.email;
        document.getElementById('reviewerDepartment').textContent = user.dept;
        document.getElementById('reviewerExaminer').textContent = user.designer;
        document.getElementById('profilePic').src = user.pic || 'user.jpg';

        // Load questions and answers
        const [answersRes] = await Promise.all([
            fetch(deptFile_shuffled)
        ]);
        answersData = await answersRes.json();
        console.log("answersData structure:", answersData);
        console.log("First item:", Object.values(answersData)[0]);
        // questionsData = await questionsRes.json();
        const questionsResponse = await fetch(`/api/questions?group=${encodeURIComponent(department)}`);
        questionsData = await questionsResponse.json();
        
        console.log(questionsData)
        
        
        totalQuestions.textContent = questionsData.length;
        console.log("currentQuestionIndex:"+currentQuestionIndex)
        console.log(questionsData[currentQuestionIndex])
        loadQuestion(currentQuestionIndex);
        updateNavigation();
    } catch (error) {
        console.error('Error loading data:', error);
    }
});

// Load a specific question
function loadQuestion(index) {
    const numQuestions = Object.keys(answersData).length;
    const indexOne = index + 1
    console.log("index:"+index)
    console.log("numQuestions:"+numQuestions)
    // const question = questionsData[index];
    const thisAnswer = Object.values(answersData)[index]
    console.log(answersData)
    console.log("thisAnswer:")
    console.log(thisAnswer)
    
    // Find matching question in questionsData
    const matchingQuestion = questionsData.find(q => q.QID === thisAnswer.QID)
    console.log("Matching question:")
    console.log(matchingQuestion["assessments"])
    console.log("currentUser:"+currentUser)
    const userComment = matchingQuestion.assessments && matchingQuestion.assessments[currentUser]
    let CriteriaStr = "<ul><li><strong>医学能力</strong></li>"+
    "若参考答案有附评分标准（适用于OSCE），请用该评分标准，并归一到满分10分（若其满分非10分）。<br><br>"+
    "否则，请参考以下尺度打分：<br>"+
    "<span style='color: red;'>【0分】：无任何医学知识</span><br>"+
    "<span style='color: red;'>【0.5-1.5分】：未受专业训练但较留意关注医学</span><br>"+
    "<span style='color: red;'>【2-3.5分】：医学院刚毕业但缺乏实践</span><br>"+
    "【4-6.5分】：专培至主冶<br>"+
    "【7-8分】：达三甲医院副高、副主任水平<br>"+
    "【8.5-9分】：达到三甲医院正高、正主任水平<br>"+
    "【9.5-10】：达到有影响力的学科带头人、全国主委、副主委等水平"+
    "</ul>"+
    "<ul><li><strong>幻觉</strong></li>"+
    "【定义】无中生有、凭空捏造的医学事实<br>"+
    "【尺度】0分为无幻觉<br>"+
    "【尺度】5分为严重幻觉，且可能造成严重医疗后果<br>"+
    "【注意】敬请持平评估"

    let commentStr = "n/a"
    if (userComment) {
        console.log("Existing assessment found for current user:", userComment)
        const diff = userComment["difficulty"]
        const diag = userComment["diagnosis"]
        const treat = userComment["treatment"]
        const proc = userComment["procedure"]
        const rare = userComment["rareDisease"]
        const comm = userComment["comment"]
        const utcDate = new Date(userComment["timestamp"])
        const shanghaiDate = new Date(utcDate.getTime() + (0 * 60 * 60 * 1000))
        const timest = shanghaiDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        commentStr ="【难度】："+diff+"<br>【涉罕】："+diag+"<br>【涉诊】："+treat+"<br>【涉治】："+proc+"<br>【涉操】："+rare+"<br>【补充意见】："+comm+"<br>【时间】："+timest
    } else {
        console.log("No assessment found for current user")
    }
    let theseResponses = Object.entries(thisAnswer.modelResponses)
    let theseResponsesSorted = theseResponses.sort((a, b) => a[0].localeCompare(b[0]))
    console.log("unsorted")
    console.log(Object.entries(thisAnswer.modelResponses))
    console.log("sorted")
    console.log(theseResponsesSorted)
    const allMODELS = {
        "G2FT": "Gemini 2.0 Flash",
        "R17": "DeepSeek R1 70B",
        "CG4L": "ChatGPT-4o latest",
        "QM212": "QWen Max",
        "RDS3": "DeepSeek R1 32B",
        "SR67": "DeepSeek R1 671B",
        "Q3B": "QWen 32B"
      };
    

    questionContainer.innerHTML = `
        <!-- Question Section -->
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse"
                    data-bs-target="#questionCollapse" aria-expanded="true">
                    Question 考题 &nbsp;&nbsp;<span><span id="currentQuestionNumber"> ${indexOne}</span> / ${numQuestions}</span> &nbsp;&nbsp;(QID:${thisAnswer.QID})&nbsp;&nbsp;题型：${thisAnswer.type}
                </button>
            </h2>
            <div id="questionCollapse" class="accordion-collapse collapse show">
                <div class="accordion-body">
                    <table class="tabl">
                        <tr>
                            <th style="ertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0; width: 60%">
                                过机内容
                            </th>
                            <th  style="vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0; width: 20%">
                                您首轮评价
                            </th>
                            <th  style="vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0;">
                                评分标准
                            </th>
                        </tr>
                        <tr>
                            <td style="vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0;">
                                ${thisAnswer.text}
                            </td>
                            <td style="vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0;">
                                ${userComment ? commentStr : "n/a"}
                            </td>
                            <td style="vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0;">
                                ${CriteriaStr}
                            </td>
                        </tr>
                    </table>
                    
                </div>
            </div>
        </div>

        <!-- Answer Section -->
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#answerCollapse">
                    Ref Answer 出题人所提供参考答案 
                </button>
            </h2>
            <div id="answerCollapse" class="accordion-collapse collapse">
                <div class="accordion-body">
                    <h6>【 注：以下内容由出题人提供，内容<strong>绝无</strong>上传至大模型】</h6>
                    <p>${thisAnswer.answer}</p>
                </div>
            </div>
        </div>

        <!-- Model Responses Section -->
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#modelResponsesCollapse">
                    Model Answers 人工智能大模型所给答案 (请在每个答案顶部打分，满分10分。（若参考答案标准为100分的，请自行除以10。）)
                </button>
            </h2>
            <div id="modelResponsesCollapse" class="accordion-collapse collapse">
                <div class="accordion-body">
                    <h5>以下模型顺序已打乱。ID和模型的对应关系表，已加密并已发至您邮箱，本轮评审结束后给您密码解锁核对。</h5>
                    <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
                    <tr>
                    ${theseResponses.map(([modelID, response]) => `
                        <!-- <div class="model-response">-->
                        <td style="width: ${100/Object.keys(thisAnswer.modelResponses).length}%; vertical-align: top; text-align:left; padding: 10px; border: 1px solid black; margin: 0;">
                            <div class="rating-container" style="width:100%;">
                                <label>医学水平 (0-10)：<span id="medStrengthSpan-${modelID}" style="width: 20%; text-align: center; font-size: x-large"><large>0</large></span>
                                    <input type="range" min="0" max="10" step="0.5" style="width: 100%"
                                        value="0"
                                        data-qid="${thisAnswer.QID}"
                                        data-model="${modelID}"
                                        class="medStrength evalSlider"
                                        style="width: 100%"
                                        disabled
                                        oninput="document.getElementById('medStrengthSpan-${modelID}').textContent = this.value">
                                </label><br>
                                <label>幻觉程度 (0-5)：<span id="halluSpan-${modelID}" style="width: 20%; text-align: center; font-size: x-large"><large>0</large></span>
                                    <input type="range" min="0" max="5" step="0.5"
                                        value="0"
                                        data-qid="${thisAnswer.QID}"
                                        data-model="${modelID}"
                                        class="hallucination evalSlider"
                                        style="width: 100%"
                                        disabled
                                        oninput="document.getElementById('halluSpan-${modelID}').textContent = this.value">
                                    <br>
                                    <input type="text" id="halluText-${modelID}" 
                                        data-qid="${thisAnswer.QID}"
                                        data-model="${modelID}"
                                        class="evalSlider"
                                        placeholder="幻觉补充说明"
                                        disabled
                                        oninput="document.getElementById('halluText-${modelID}').value = this.value"></input>
                                </label>
                                
                            </div>
                            <!--<h6>【ID:${modelID.substring(0, 6)}】</h6>-->
                            <h6>【ID:${modelID}】</h6>
                            <h6>【by:${allMODELS[modelID.substring(7)]}】</h6>
                            <p>${response}</p>
                            
                        <!--</div>-->
                        </td>
                    `).join('')}
                    </tr>
                    </table>
                </div>
            </div>
        </div>
    `;

   // Function to set rating values
    async function setRatingValues(qid, modelID) {
        try {
            const scoresResponse = await fetch(`/api/scores?qid=${qid}&model=${modelID}`);
            if (!scoresResponse.ok) {
                console.error('Error loading scores:', scoresResponse.status);
                return;
            }
            const scores = await scoresResponse.json();

            if (scores && scores.length > 0) {
                const userEntry = scores.find(entry => entry.email === currentUser);
                
                if (userEntry) {
                    const strength = userEntry.strength !== null ? parseFloat(userEntry.strength) : 0;
                    const hallucination = userEntry.hallucination !== null ? parseFloat(userEntry.hallucination) : 0;
                    const halluText = userEntry.halluText !== null ? userEntry.halluText : "";
                    console.log("halluText")
                    console.log(halluText)

                    const medStrengthSpan = document.getElementById(`medStrengthSpan-${modelID}`);
                    medStrengthSpan.textContent = strength;
                    medStrengthSpan.style.fontSize = 'x-large';
                    medStrengthSpan.style.color = (strength <= 3.5) ? 'red' : (strength >= 4 && strength <= 6) ? 'black' : (strength >= 6.5 && strength <= 8.5) ? 'black' : (strength >= 9) ? 'black' : 'inherit';

                    const hallucinationSpan = document.getElementById(`halluSpan-${modelID}`);
                    hallucinationSpan.textContent = hallucination;
                    hallucinationSpan.style.fontSize = 'x-large';
                    hallucinationSpan.style.color = (hallucination <= 0.5) ? 'black' : (hallucination >= 1 && hallucination <= 3) ? 'red' : (hallucination >= 3.5 && hallucination <= 8.5) ? 'darkred' : (hallucination >= 9) ? 'darkred' : 'inherit';

                    const medStrengthInput = document.querySelector(`.rating-container input[data-model="${modelID}"][class*="medStrength"]`);
                    if (medStrengthInput) medStrengthInput.value = strength;
                    const hallucinationInput = document.querySelector(`.rating-container input[data-model="${modelID}"][class*="hallucination"]`);
                    if (hallucinationInput) hallucinationInput.value = hallucination;

                    const halluTextInput = document.getElementById(`halluText-${modelID}`);
                    halluTextInput.value = halluText;
                }
            }
        } catch (error) {
            console.error('Error loading scores:', error);
        }
    }

    // Call setRatingValues for each model
    theseResponses.forEach(([modelID, response]) => {
        setRatingValues(thisAnswer.QID, modelID);
    });

   // Add event listeners for rating inputs
    document.querySelectorAll('.evalSlider').forEach(input => {
        input.addEventListener('change', async (e) => {
            const qid = e.target.dataset.qid;
            const model = e.target.dataset.model;
            const value = parseFloat(e.target.value);
            const type = e.target.classList.contains('medStrength') ? 'strength' : 'hallucination';
            const modelID = e.target.dataset.model;

            const reviewerName = document.getElementById('reviewerName').textContent;
            const halluComment = document.getElementById(`halluText-${model}`).value;
            console.log("halluComment:"+halluComment)

            const medStrengthSpan = document.getElementById(`medStrengthSpan-${modelID}`);
            if (medStrengthSpan) {
                medStrengthSpan.style.fontSize = 'x-large';
                medStrengthSpan.style.color = (value <= 3.5) ? 'red' : (value >= 4 && value <= 6) ? 'black' : (value >= 6.5 && value <= 8.5) ? 'black' : (value >= 9) ? 'black' : 'inherit';
            }

            const hallucinationSpan = document.getElementById(`halluSpan-${model}`);
            if (hallucinationSpan) {
                hallucinationSpan.style.fontSize = 'x-large';
                hallucinationSpan.style.color = (value <= 0.5) ? 'black' : (value >= 1 && value <= 3) ? 'red' : (value >= 3.5 && value <= 8.5) ? 'darkred' : (value >= 9) ? 'darkred' : 'inherit';
            }
           
            // console.log("modelID:"+modelID)
            // console.log("halluText:"+halluText)
            // Send data to index.js
            try {
                const response = await fetch('/api/save-scores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        qid: qid,
                        model: model,
                        user: currentUser,
                        name: reviewerName,
                        strength: type === 'strength' ? value : undefined,
                        hallucination: type === 'hallucination' ? value : undefined,
                        halluText: halluComment
                    })
                });

                if (!response.ok) {
                    console.error('Error saving scores:', response.status);
                }
            } catch (error) {
                console.error('Error saving scores:', error);
            }
        });
    });

    currentQuestionNumber.textContent = index + 1;
    updateNavigation();
}

// Handle navigation
prevButton.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion(currentQuestionIndex);
    }
});

nextButton.addEventListener('click', () => {
    if (currentQuestionIndex < questionsData.length - 1) {
        currentQuestionIndex++;
        loadQuestion(currentQuestionIndex);
    }
});

// Update navigation buttons
function updateNavigation() {
    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.disabled = currentQuestionIndex === questionsData.length - 1;
}

// Save rating to localStorage
function saveRating(event) {
    const input = event.target;
    const qid = input.dataset.qid;
    const model = input.dataset.model;
    const type = input.classList.contains('medical-ability') ? 'medicalAbility' : 'hallucination';
    const value = parseInt(input.value);

    // Get existing ratings or create new object
    const ratings = JSON.parse(localStorage.getItem('ratings')) || {};
    if (!ratings[qid]) ratings[qid] = {};
    if (!ratings[qid][model]) ratings[qid][model] = {};
    
    ratings[qid][model][type] = value;
    localStorage.setItem('ratings', JSON.stringify(ratings));
}
async function logout() {
    const canLogout = await validateAllQuestionsAnswered(() => {
        fetch('/logout', { method: 'POST' })
            .then(() => window.location.href = '/')
            .catch(err => console.error('Logout error:', err));
    });
    
    if (canLogout) {
        fetch('/logout', { method: 'POST' })
            .then(() => window.location.href = '/')
            .catch(err => console.error('Logout error:', err));
    }
}

// Back button functionality
document.getElementById('backButton').addEventListener('click', () => {
    // window.location.href = '/reviewer.html';
    const email = new URLSearchParams(window.location.search).get('email');
    window.location.href = `/reviewer?email=${encodeURIComponent(email)}`;
});

document.getElementById('disagreeBtn').addEventListener('click', () => {
    // window.location.href = '/reviewer.html';
    const email = new URLSearchParams(window.location.search).get('email');
    window.location.href = `/reviewer?email=${encodeURIComponent(email)}`;
});