library(tidyverse)
library(showtext)

# Load Chinese fonttukey

showtext_auto()
font_add("SimHei", "SimHei.ttf")  # Use a Chinese font file
#######################################################
load("scores.mar25.1830.RData")

#############################################
nameGoodProgress<-gsub("_", "", SUMMARY$name[which(SUMMARY$progress>20)])


LQID<-sapply(LDept, names)
LCOR<-list()
LUSER<-list()
LTypes<-sapply(LDept, function(thisDept){sapply(thisDept, function(x)x$type)})

corDept<-list()
LFatigue<-list()
for(i in 1:length(LQID)){
	theseIDS<-LQID[[i]]
	theseResponses<-LDept[[i]]
	indi<-match(theseIDS, names(scores))
	scoresi<-scores[indi]
	LCORi<-list()
	for(j in 1:length(scoresi)){
		scoresij<-scoresi[[j]]
		USERS<-unique(as.vector(unlist(sapply(scoresij, function(x)x$user))))
		USERS<-c(USERS)
		thisNCHAR<-sapply(theseResponses[[names(scoresi)[j]]][["modelResponses"]], nchar)
		
		matij<-sapply(USERS, function(userij){
			sapply(scoresij, function(x)x$strength[match(userij, x$user)])
		})
		corFatigue<-cor(matij, thisNCHAR[rownames(matij)])
		for(k in 1:length(corFatigue)){
			namek<-rownames(corFatigue)[k]
			if(is.null(LFatigue[[namek]]))
				LFatigue[[namek]]<-c()
			LFatigue[[namek]]<-c(LFatigue[[namek]], corFatigue[k])

		}
		colnames(matij)<-gsub("_", "", USERS)
		sd1<-apply(matij, 2, sd)
		for(k in 1:length(sd1)){
			LUSER[[names(sd1)[k]]]<-c(LUSER[[names(sd1)[k]]], sd1[k])
		}
		#matij<-matij[, colnames(matij)%in%nameGoodProgress, drop=F]
		CORij<-cor(matij, use="pairwise.complete.obs")
		CORij[upper.tri(CORij)]<-NA
		datij<-as.data.frame(as.table(CORij)) %>% filter(!is.na(Freq)) %>% filter(Var1 != Var2)
		if(nrow(datij)==0)next
		pairsij<-apply(apply(as.matrix(datij[, c("Var1", "Var2")]), 1, sort), 2, paste0, collapse="_")
		datij[["pairs"]]<-pairsij
		for(k in 1:nrow(datij)){
			if(length(LCORi[[datij$pairs[k]]])==0){
				LCORi[[datij$pairs[k]]]<-rep(NA, length(scoresi))
			}
			if(length(LCOR[[datij$pairs[k]]])==0){
				LCOR[[datij$pairs[k]]]<-rep(NA, length(scoresi))
				corDept[[datij$pairs[k]]]<-names(LTypes)[i]
			}
			#LCORi[[datij$pairs[k]]]<-c(LCORi[[datij$pairs[k]]], datij$Freq[k])
			#LCOR[[datij$pairs[k]]]<-c(LCOR[[datij$pairs[k]]], datij$Freq[k])
			LCORi[[datij$pairs[k]]][j]<- datij$Freq[k]
			LCOR[[datij$pairs[k]]][j] <- datij$Freq[k]

		}
	}
	par(mar=c(8, 4, 4, 2))
	boxplot(LCORi, las=2)
	medi<-median(setdiff(unlist(LCORi), NA))
	cat(names(LQID)[i], "\t", medi, "\n")
}

LFatigue2<-LFatigue[sapply(LFatigue, length)>5 & sapply(LFatigue, function(x)sum(is.na(x)))<10]
pdf("fatigue.monitoring.pdf", width=24, height=12)
	par(mar=c(4, 4, 2, 2))
	par(mfrow=c(6,7))
	for(i in 1:length(LFatigue2)){
		barplot(LFatigue2[[i]], main=paste0(names(LFatigue2)[i], " 主任"), ylab="与文本长度相关系数")
		mtext("\n \n 题目", side=1)
	}
dev.off()




