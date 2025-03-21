library(jsonlite)

Sys.setlocale("LC_ALL", "Chinese")
fileJson<-"scores.json"
loginJson<-"login.json"
medTestJson<-"medTest.json"

# Read the JSON file
jsonData<- jsonlite::fromJSON(fileJson)
loginData<- jsonlite::fromJSON(loginJson)
medTestData<- jsonlite::fromJSON(medTestJson)

medTest<-medTestData[[1]][[2]]
LQID<-sapply(medTestData[[1]][[2]], function(x)x[["QID"]])
names(LQID)<-medTestData[[1]][["dept"]]
matTotal<-as.matrix(sapply(LQID, length))


USERS<-loginData[[1]]
# Print the data to inspect it
#print(jsonData)
REVIEWERS<-USERS[USERS$role=="reviewer", c("dept", "name")]
REVIEWERS[["numTotal"]]<-matTotal[match(REVIEWERS$dept, rownames(matTotal))]


allQNames<-names(jsonData)
for(i in 1:length(allQNames)){
	thisQName<-allQNames[[i]]
	thisQuestion<-jsonData[[thisQName]]
	#print(names(thisQuestion))
	for(j in 1:length(thisQuestion)){
		TMPj<-data.frame(AID=names(thisQuestion)[j], thisQuestion[[j]])
		if(j==1){
			SCORESj<-TMPj
		}else{
			SCORESj<-rbind(SCORESj,TMPj)
		}
		rm(list=("TMPj"))
	}
	SCORESi<-data.frame(QID=thisQName, SCORESj)
	if(i==1){SCORES<-SCORESi}else{
		SCORES<-rbind(SCORES, SCORESi)
	}
}

###################################
table(SCORES$user %in% USERS$name)
indU<-match(SCORES$user, USERS$name)
USERS2<-USERS[indU, ]
SCORES[["dept"]]<-USERS2$dept
SCORES3<-SCORES[!is.na(SCORES$strength), ]

table(is.na(SCORES$strength))

mat<-as.matrix(sapply(split(SCORES3$strength, SCORES3$user), length))
matAvrg<-as.matrix(sapply(split(SCORES3$strength, SCORES3$user), mean, na.rm=T))

SUMMARY<-REVIEWERS
SUMMARY[["avrgRating"]]<-round(matAvrg[match(SUMMARY$name, rownames(matAvrg)), 1], 2)
SUMMARY[["avrgRating"]][is.na(SUMMARY[["avrgRating"]])]<-0

SUMMARY[["numAnswersTotal"]]<-SUMMARY[["numTotal"]] *7
SUMMARY[["numAnswersScored"]]<-mat[match(SUMMARY$name, rownames(mat)), 1]
SUMMARY[["numAnswersScored"]][is.na(SUMMARY[["numAnswersScored"]])]<-0
SUMMARY[["progress"]]<- round(SUMMARY[["numAnswersScored"]]/SUMMARY[["numAnswersTotal"]] *100, 1)


###################################
jsonDept<-list.files(path= "deptJsons/", pattern="_shuffled.json", full.names=T)
LDept<-list()
for(i in 1:length(jsonDept)){
	deptName<-gsub("_shuffled.json", "", substr(jsonDept[i], 23, 100))
	thisDeptJson<- jsonlite::fromJSON(jsonDept[i])
	LDept[[deptName]]<-thisDeptJson
}
###################################
scores<- jsonlite::fromJSON(fileJson)
loginData<- jsonlite::fromJSON(loginJson)
medTestData<- jsonlite::fromJSON(medTestJson)
###################################
origDepts<-medTestData[[1]][[1]]
origmedTest<-medTestData[[1]][[2]]
LQIDorig<-sapply(origmedTest, function(x){
	x$QID
})
LAssess<-sapply(origmedTest, function(x){
	x$assessments
})
LAssess2<-LAssess[1:13]
for(i in 1:13){
	tmpi<-LAssess[[i]]
	rownames(tmpi)<-origmedTest[[i]]$QID
	indi<-match(names(LDept[[i]]), origmedTest[[i]]$QID)
	#print(indi)
	cat("# NA:", sum(is.na(indi)), "\tNum levels:", length(table(table(indi))), "\n")
	tmpi2<-tmpi[indi, , drop=F]
	LAssess2[[i]]<-tmpi2
}

###########################################
LQuestions<-list()
for(i in 1:length(LAssess2)){
	tmpi<-LAssess2[[i]]
	firstTmp<-tmpi[[1]]
	DatDiff<-sapply(tmpi, function(x)x$difficulty)
	DiffNum<-rowMeans(t(apply(DatDiff, 1, function(x){
		as.integer(factor(x, levels=c("easy", "medium", "hard")))
	})))
	DiffGrade<-round(DiffNum)

	DatRare<-sapply(tmpi, function(x)x$diagnosis)
	DatDiag<-sapply(tmpi, function(x)x$treatment)
	DatTreat<-sapply(tmpi, function(x)x$procedure)
	DatProc<-sapply(tmpi, function(x)x$rareDisease)

	GETNUM<-function(DATin, LEVELS=c("false", "true")){
		inNum<-rowMeans(t(apply(DATin, 1, function(x){
			as.integer(factor(x, levels=LEVELS))
		})))
	}
	RareNum<-GETNUM(DatRare)
	RareGrade<-round(RareNum)

	DiagNum<-GETNUM(DatDiag)
	DiagGrade<-round(DiagNum)

	TreatNum<-GETNUM(DatTreat)
	TreatGrade<-round(TreatNum)

	ProcNum<-GETNUM(DatProc)
	ProcGrade<-round(ProcNum)
	resDAT<-data.frame(QID=rownames(tmpi), dept=origDepts[i], DiffGrade, RareGrade, DiagGrade, TreatGrade, ProcGrade)
	LQuestions[[i]]<-resDAT
	if(i==1){DATround1<-resDAT}else{
		DATround1<-rbind(DATround1, resDAT)
	}
}

 table(DATround1$dept, DATround1$DiffGrade)
 table(DATround1$dept, DATround1$RareGrade)
 table(DATround1$dept, DATround1$DiagGrade)
 table(DATround1$dept, DATround1$TreatGrade)
 table(DATround1$dept, DATround1$ProcGrade)

save(SUMMARY, SCORES3, 
	scores, loginData, medTestData, LDept, LAssess, LAssess2, origDepts, DATround1, file="scores.RData")




