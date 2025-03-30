library(jsonlite)
library(tidyverse)

source("step1.helpers.R")

#####################################################
Sys.setlocale("LC_ALL", "Chinese")
fileJson<-"scores.json"
loginJson<-"login.json"
medTestJson<-"medtest.noAE02.OSCE.json"

# Read the JSON file
jsonData0<- jsonlite::fromJSON(fileJson)
loginData<- jsonlite::fromJSON(loginJson)
authors<-loginData[[1]]
medTestData<- jsonlite::fromJSON(medTestJson)


#####################################################

medTest<-medTestData[[1]][[2]]
LQID<-sapply(medTestData[[1]][[2]], function(x)x[["QID"]])
names(LQID)<-medTestData[[1]][["dept"]]
#matTotal<-as.matrix(sapply(LQID, length))

#####################################################
qidDQ<-c("zC3MBOFR", "Czq5nQTv", "FCLIFzhg", "xIOgNhTg", "R6gwwNf8", 
	"7jOM7mhZ", "4ZKFzMdT", "DtBJaljc", "uFieo4IJ", "jESryR7N")
matTotal<-as.matrix(sapply(LQID, function(x)length(setdiff(x, qidDQ))))

#####################################################
table(allQNames %in% qidDQ)
jsonData<-jsonData0[!names(jsonData0) %in% qidDQ]

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
authors<-loginData[[1]]
# Print the data to inspect it
#print(jsonData)
REVIEWERS<-authors#[authors$role=="reviewer", c("dept", "name")]
REVIEWERS[["numTotal"]]<-matTotal[match(REVIEWERS$dept, rownames(matTotal))]


table(SCORES$user %in% authors$name)
indU<-match(SCORES$user, authors$name)
authors2<-authors[indU, ]
SCORES[["dept"]]<-authors2$dept
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
SUMMARY<-SUMMARY[order(SUMMARY$dept), ]

SUMMARY_indep<-SUMMARY[SUMMARY$name %in% authors$name[authors$role %in%"reviewer"], ]
###################################
jsonDept<-list.files(path= "deptJsons/", pattern="_shuffled.json", full.names=T)[c(2,1,seq(3,14))]
LDept<-list()
for(i in 1:length(jsonDept)){
	deptName<-gsub("_shuffled.json", "", substr(jsonDept[i], 23, 100))
	thisDeptJson<- jsonlite::fromJSON(jsonDept[i])
	LDept[[deptName]]<-thisDeptJson
	#boxplot(t(sapply(thisDeptJson, function(thisQ){x<-sapply(thisQ$modelResponses, nchar); return(as.vector(x))})))
	for(j in 1:length(thisDeptJson)){
		thisQ<-thisDeptJson[[j]]
		x<-as.vector(sapply(thisQ$modelResponses, nchar))
		aid<-names(thisQ$modelResponses)
		NCHARij<-data.frame(aid, x)
		if(i==1&j==1){
			NCHAR<-NCHARij
		}else{
			NCHAR<-rbind(NCHAR, NCHARij)
		}
	}
}
LTypes<-sapply(LDept, function(thisDept){sapply(thisDept, function(x)x$type)})

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
LTypeorig<-sapply(origmedTest, function(x){
	x$QID
})
LAssess<-sapply(origmedTest, function(x){
	x$assessments
})
LAssess2<-LAssess[1:14]
for(i in 1:14){
	tmpi<-LAssess[[i]]
	rownames(tmpi)<-origmedTest[[i]]$QID
	indi<-match(names(LDept[[i]]), origmedTest[[i]]$QID)
	#print(indi)
	cat("# NA:", sum(is.na(indi)), "\tNum levels:", length(table(table(indi))), "\n")
	tmpi2<-tmpi[indi, , drop=F]
	LAssess2[[i]]<-tmpi2
}

###########################################
matTypes<-data.frame(QID=gsub("[0-9a-z]+\\.[a-zA-Z0-9]+\\.", "", names(unlist(LTypes))),
	team=sapply(strsplit(names(unlist(LTypes)), "\\."), function(x)x[2]),
	type=as.character(unlist(LTypes)))
matTypes[c(684, 693), "type"]<-"realCases"
###########################################

GETconsensu<-function(DATin, LEVELS=c("no", "yes")){
	GRADESnoyes<-c("no", "yes")
	authorsIN<-authors[match(colnames(DATin), authors$initials), , drop=F]
	print(authorsIN)
	inNum<-rowMeans(t(apply(DATin, 1, function(x){
		as.integer(factor(x, levels=LEVELS))
	})))
	consensus<-GRADESnoyes[round(inNum)]
	indDesign<-which(authorsIN$role%in%c("designer", "nonIndep_reviewer"))
	if(length(indDesign)==0){
		indDesign<-which(authorsIN$initials=="YSJ")
	}
	ratioCons<-apply(DATin, 2, function(x) sum(x==DATin[, indDesign], na.rm=T)/length(x))
	names(ratioCons)[indDesign] <-paste0("01.", names(ratioCons)[indDesign], "*")
	print(ratioCons)
	RES<-list(consensus=consensus, ratioCons=ratioCons, indDesign=indDesign)
	return(RES)
}
getFirstRound<-function(tmpIn, varIN="diagnosis"){
	GRADESnoyesTF<-c("false"="no", "true"="yes", "easy"="easy", "medium"="medium", "hard"="hard")
	DatIn<-sapply(tmpIn, function(x)GRADESnoyesTF[x[[varIN]]])
	#print(colnames(DatIn))
	indFL<-grep("fenglin|shanaj", colnames(DatIn))
	#print(indFL)
	#if(length(indFL)>0){
		#print(colnames(DatIn)[indFL])
		#DatIn<-DatIn[, -indFL]
	#}
	oldColN<-colnames(DatIn)
	newColN<-authors$initials[match(oldColN, authors$email)]
	colnames(DatIn)<-newColN
	return(DatIn)
}
GRADES<-c("easy", "medium", "hard")

###########################################
data.frame(names(LDept), origDepts[1:14])
pdf("consensus.first.round.pdf", width=12, height=8)
LQuestions<-list()
LfirstRound<-list()

par(mfrow=c(3, 5))
for(i in 1:length(LAssess2)){
	tmpi<-LAssess2[[i]]
	firstTmp<-tmpi[[1]]
	thisTeam<-LDept[[i]]
	DatDiff<-getFirstRound(tmpi, "difficulty")
	DatRare<-getFirstRound(tmpi, "diagnosis")
	DatDiag<-getFirstRound(tmpi, "treatment")
	DatTreat<-getFirstRound(tmpi, "procedure")
	DatProc<-getFirstRound(tmpi, "rareDisease")

	DiffNum<-t(apply(DatDiff, 1, function(x){
		as.integer(factor(x, levels=c("easy", "medium", "hard")))
	}))
	colnames(DiffNum)<-colnames(DatDiff)
	DiffGrade<-round(rowMeans(DiffNum))
	RESRare<-GETconsensu(DatRare)
	RESDiag<-GETconsensu(DatDiag)
	RESTreat<-GETconsensu(DatTreat)
	RESProc<-GETconsensu(DatProc)

	RareGrade<-RESRare$consensus
	DiagGrade<-RESDiag$consensus
	TreatGrade<-RESTreat$consensus
	ProcGrade<-RESProc$consensus

	theseTypes<-matTypes$type[match(rownames(tmpi), matTypes$QID)]
	firstRound<-data.frame(QID=rownames(tmpi), qType=theseTypes, isDisqualified=rownames(tmpi)%in%qidDQ, DatDiff,
		DatRare, DatDiag, DatTreat, DatProc, 
		DiffGradeCons=GRADES[DiffGrade],
		RareCons=RareGrade, 
		DiagCons=DiagGrade, 
		TreatCons=TreatGrade, 
		ProcCons=ProcGrade)

	indDesign<-which(colnames(DatDiff) %in% c(authors$initials[authors$role %in% c("designer", "nonIndep_reviewer")], "YSJ"))
	ratioConsDiff<-apply(DatDiff, 2, function(x) sum(x==DatDiff[, indDesign], na.rm=T)/length(x))
	names(ratioConsDiff)[indDesign] <-paste0("01.", names(ratioConsDiff)[indDesign], "*")
	matRatioCons<-rbind(ratioConsDiff, Rare=RESRare$ratioCons, Diag=RESDiag$ratioCons, Treat=RESTreat$ratioCons, Proc=RESProc$ratioCons)
	matRatioCons<-matRatioCons[, order(colnames(matRatioCons))]
	barplot(matRatioCons, beside=T, main=names(LDept)[i], ylim=c(0, 1))

	print(match(sapply(thisTeam, function(x)x$QID), firstRound$QID))
	#xlsx::write.xlsx(firstRound, "firstRound.mar29.2025.1930.xlsx", 
	#	sheetName = paste0(i, "_", origDepts[i]),
	#	col.names = TRUE, row.names = TRUE, append = T)


	LfirstRound[[i]]<-list(DiffNum=DiffNum, firstRound=firstRound, matRatioCons=matRatioCons)
	print(table(names(LTypes[[i]])==rownames(tmpi)))
	resDAT<-data.frame(QID=rownames(tmpi), dept=origDepts[i], type=LTypes[[i]], 
		DiffGrade, RareGrade, DiagGrade, TreatGrade, ProcGrade)
	LQuestions[[i]]<-resDAT
	if(i==1){DATround1<-resDAT}else{
		DATround1<-rbind(DATround1, resDAT)
	}
}
dev.off()

tab1<- table(paste0(DATround1$dept, "_", DATround1$type), DATround1$DiffGrade)
tab2<- table(paste0(DATround1$dept, "_", DATround1$type), DATround1$RareGrade)
tab3<- table(paste0(DATround1$dept, "_", DATround1$type), DATround1$DiagGrade)
tab4<- table(paste0(DATround1$dept, "_", DATround1$type), DATround1$TreatGrade)
tab5<- table(paste0(DATround1$dept, "_", DATround1$type), DATround1$ProcGrade)

tab12345<-cbind(tab1, tab2, tab3, tab4, tab5)
###########################################
for(i in 1:length(LAssess2)){
	thisFirstRound<-LfirstRound[[i]]$firstRound
	tmpRrndi<-thisFirstRound[, c("QID", "qType", "isDisqualified", "DiffGradeCons", "RareCons", "DiagCons", "TreatCons", "ProcCons")]
	DiffNum<-data.frame(i=i, LfirstRound[[i]]$DiffNum, qType=thisFirstRound$qType)
	Rare<-data.frame(i=i, isRare=thisFirstRound$RareCons, qType=thisFirstRound$qType)

	df_long <- DiffNum%>%
		pivot_longer(cols= -c(i, qType), names_to = "location", values_to = "value")
	if(i==1){
		DIFFNUM<-df_long
		ROUNDS<-data.frame(i=i, tmpRrndi)
		RARE<-Rare
	}else{
		DIFFNUM<-rbind(DIFFNUM, df_long)
		ROUNDS<-rbind(ROUNDS, data.frame(i=i, tmpRrndi))
		RARE<-rbind(RARE, Rare)
	}
}
ROUNDS<-ROUNDS[ROUNDS$isDisqualified=="FALSE", ]
datDiffCons<-table(paste0(names(LDept)[ROUNDS$i], ":", ROUNDS$qType), factor(ROUNDS$DiffGradeCons, levels=c("easy", "medium", "hard")))
ratioDiffCons<-apply(datDiffCons, 1, function(x)x*100/sum(x))
ratioDiffConsOSCE<-ratioDiffCons[, grepl("OSCE", colnames(ratioDiffCons))]
ratioDiffConsReal<-ratioDiffCons[, grepl("real", colnames(ratioDiffCons))]
pdf("round1.consensu.difficulty.pdf", width=12)
	par(mfrow=c(1,2))
	par(mar=c(12,4,2,2))
	barplot(ratioDiffConsOSCE, las=2)
	barplot(ratioDiffConsReal, las=2)
	for(VAR in c( "RareCons", "DiagCons", "TreatCons", "ProcCons")){
		datCons<-table(paste0(names(LDept)[ROUNDS$i], ":", ROUNDS$qType), factor(ROUNDS[[VAR]], levels=c("no", "yes")))
		ratioCons<-apply(datCons, 1, function(x)x*100/sum(x))
		ratioConsOSCE<-ratioCons[, grepl("OSCE", colnames(ratioCons))]
		ratioConsReal<-ratioCons[, grepl("real", colnames(ratioCons))]
		barplot(ratioConsOSCE, las=2, main=VAR)
		barplot(ratioConsReal, las=2, main=VAR)
	}
dev.off()

rowSums(datDiffCons[match(colnames(ratioDiffConsOSCE), rownames(datDiffCons)), ])
rowSums(datDiffCons[match(colnames(ratioDiffConsReal), rownames(datDiffCons)), ])

DIFFNUM[["role"]]<-authors$role[match(DIFFNUM$location, authors$initials)]
DIFFNUM2<-DIFFNUM[DIFFNUM$role!="DQreviewer", ]
summary(lm(value~qType + role+0, DIFFNUM2))
TukeyHSD(aov(value~role+0, DIFFNUM2))
confint(aov(value~role+0, DIFFNUM2))

###########################################
cbind(names(LQID)[1:14], names(LDept)[1:14])
LWIDE<-list()
for(i in 1:14){
	theseIDS2<-LQID[[i]]
	theseIDS<-names(LDept[[i]])
	theseResponses<-LDept[[i]]
	thisDeptName<-names(LQID)[i]
	thisDeptNameEng<-names(LDept)[i]
	indi<-match(theseIDS, names(scores))
	scoresi<-scores[indi]
	for(j in 1:length(scoresi)){
		scoresij<-scoresi[[j]]
		for(k in 1:length(scoresij)){
			tmpijk<-data.frame(i=i, thisDeptName, thisDeptNameEng, j=j, QID=theseIDS[j], k=k, AID=names(scoresij)[k], scoresij[[k]])
			if(k==1){
				RESij<-tmpijk
			}else{
				RESij<-rbind(RESij, tmpijk)
			}
		}
		if(j==1){
			RESi<-RESij
		}else{
			RESi<-rbind(RESi, RESij)
		}
	}
	df_wide <- RESi%>%
  		pivot_wider(names_from = c(user, email), values_from = c(strength, hallucination, halluText))
	LWIDE[[i]]<-df_wide
	xlsx::write.xlsx(df_wide, "ratings.mar25.2025.xlsx", 
		sheetName = paste0(i, "_", thisDeptName),
		col.names = TRUE, row.names = TRUE, append = F)

	if(i==1){
		RES<-RESi
	}else{
		RES<-rbind(RES, RESi)
	}
}
###########################################
###########################################
for(i in 1:14){
	thisWide <- LWIDE[[i]]
	for(j in 1:max(thisWide$j)){
		WIDEij<-thisWide[thisWide$j==j, ]
		qTypeij<-matTypes$type[match(WIDEij$QID, matTypes$QID)]
		theseQIDs<-WIDEij$QID
		modelSuff<- gsub(".*-", "", WIDEij$AID)
		STRENGTHij<-WIDEij[, grep("strength", colnames(WIDEij))]
		colnames(STRENGTHij)<-gsub("strength_", "", colnames(STRENGTHij))
		colnames(STRENGTHij)<-gsub("_[a-z].*", "", colnames(STRENGTHij))
		colnames(STRENGTHij)<-gsub("_", "", colnames(STRENGTHij))
		colnames(STRENGTHij)<-gsub("56415607@qq.com", "", colnames(STRENGTHij))
 		thisLength<-NCHAR$x[match(WIDEij$AID, NCHAR$aid)]

		STRENGTHij2<-STRENGTHij #[, which(colnames(STRENGTHij) %in% indepRev28), drop=F]
		STRENGTHij3<-as.matrix(STRENGTHij2)
		#if(sum(is.na(STRENGTHij))>0)next
		RANKij<-apply(STRENGTHij2, 2, rank)
		#tmpij<-data.frame(i=i, j=j, modelSuff, AID=WIDEij$AID, mRank=rowMeans(RANKij))
		MATij<-as.matrix(RANKij)
		for(k in 1:ncol(STRENGTHij2)){
			strengthijk<-STRENGTHij3[, k]
			scaleStrengthijk<-strengthijk/(thisLength/1e3)
			rankijk<-rank(strengthijk)
			scaleRankijk<-rank(scaleStrengthijk)

			tmpij<-data.frame(i=i, j=j, theseQIDs=theseQIDs, qTypeij=qTypeij, thisDeptName=WIDEij$thisDeptName, thisDeptNameEng=WIDEij$thisDeptNameEng, modelSuff, len=thisLength, AID=WIDEij$AID, 
				reviewer=colnames(MATij)[k], strength=strengthijk, rank=rankijk, ncharrank=rank(thisLength), scaleStrength=scaleStrengthijk, scaleRank=scaleRankijk)

			if(i==1 && j==1 && k==1){
				RANK<-tmpij
			}else{
				RANK<-rbind(RANK, tmpij)
			}
		}
	}
}
RANK[["model"]]<-MODELS[RANK$modelSuff]
RANK[["nchar"]]<- NCHAR$x[match(RANK$AID, NCHAR$aid)]/1e3
dim(RANK)

RANK<-RANK %>% filter(!is.na(rank)) %>% filter(!is.na(strength))
dim(RANK)

print(table(RANK$reviewer, RANK$reviewer%in%indepRev28))
RANK28<-RANK[RANK$reviewer%in%indepRev28, ]
print(table(RANK28$reviewer, RANK28$reviewer%in%indepRev28))

print(table(RANK28$reviewer, RANK28$thisDeptName))

table(RANK28$theseQIDs %in% qidDQ)
RANK28pure<-RANK28[!RANK28$theseQIDs %in% idDQ, ]

round(print(table(paste0(RANK28$reviewer, "_", RANK28$qTypeij), RANK28$thisDeptName))/7, 1)


dim(RANK)
dim(RANK28)
dim(RANK28pure)




save(SUMMARY, SCORES3, LTypes, MODELS, authors, LfirstRound,
	scores, loginData, medTestData, LDept, LAssess, LAssess2, origDepts, DATround1, tab12345, 
	RANK, RANK28, RANK28pure, matTypes,
	file="scores.mar30.1530.RData")




