library(gplots)
library(tidyverse)


jsonRound3<-list.files(path= "./", pattern="_shuffled.json", recursive=T, full.names=T)
PREF<-sapply(strsplit(jsonRound3, "/"), function(x)x[2])

jsonRound32<-jsonRound3[PREF!="deptJsons_round3"]
PREF2<-PREF[PREF!="deptJsons_round3"]

unqPREF<-unique(PREF2)
LMoM<-list()
for(i in 1:4){
	indi<-which(PREF2==unqPREF[i])
	filesi<-jsonRound32[indi]
	for(j in 1:length(filesi)){
		thisFile<-filesi[[j]]
		thisMoM<- jsonlite::fromJSON(thisFile)
		tmpj<-as.matrix(unlist(thisMoM))
		if(j==1){
			MoMj<-tmpj
		}else{
			MoMj<-rbind(MoMj, tmpj)
		}
	}
	LMoM[[unqPREF[i]]]<-MoMj
}

v1<-venn(sapply(LMoM, rownames))
str(attr(v1, "intersect"))

commonIDs<-attr(v1, "intersect")[["deepseek_671b_evaluation:goog:gpt_results:qwen-max-2025-01-25_evaluation"]]

matMoM<-matrix(NA, length(commonIDs), 4)
for(i in 1:4){
	tmpj<-LMoM[[i]]
	indi<-match(commonIDs, rownames(tmpj))
	matMoM[, i]<-tmpj[indi,1]
}
colnames(matMoM)<-gsub("[_-].*", "", unqPREF)

plot(as.data.frame(matMoM), pch=".")

cor(matMoM)
######################################
load("../5.human.rating/thisRANKmod.RData")

commonAIDs<-gsub(".*\\.","", commonIDs)
sort(setdiff(commonAIDs, thisRANKmod$AID))
sort(setdiff(thisRANKmod$AID, commonAIDs))

AID12<-intersect(commonAIDs, thisRANKmod$AID)
matMoM2<-matMoM[match(AID12, commonAIDs), ]
thisRANKmod2<-thisRANKmod[match(AID12,  thisRANKmod$AID), ]

thisRANKmod12<-cbind(thisRANKmod2, matMoM2)

df_long <- thisRANKmod12%>%
  pivot_longer(
    cols = tail(names(thisRANKmod12), 4),  # the last 4 columns
    names_to = "LLM",      # new column with former column names
    values_to = "val"         # new column with their values
  )

mod31a<-lm(val~ model +LLM + ncharrank + qType +thisDeptNameEng +DiffGradeCons + RareCons + DiagCons + TreatCons + ProcCons+qlen+0, data=df_long)

