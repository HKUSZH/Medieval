library(tidyverse)
library(showtext)

# Load Chinese font
showtext_auto()
font_add("SimHei", "SimHei.ttf")  # Use a Chinese font file


load("scores.RData")

###########################################
scores

nameGoodProgress<-SUMMARY$name[which(SUMMARY$progress>20)]


###########################################
LQID<-sapply(LDept, names)
LCOR<-list()
LUSER<-list()
LTypes<-sapply(LDept, function(thisDept){sapply(thisDept, function(x)x$type)})

corDept<-list()
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
		matij<-sapply(USERS, function(userij){
			sapply(scoresij, function(x)x$strength[match(userij, x$user)])
		})
		colnames(matij)<-USERS
		sd1<-apply(matij, 2, sd)
		for(k in 1:length(sd1)){
			LUSER[[names(sd1)[k]]]<-c(LUSER[[names(sd1)[k]]], sd1[k])
		}
		matij<-matij[, colnames(matij)%in%nameGoodProgress, drop=F]
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
###########################################
par(mar=c(8, 4, 4, 2))
ord1<-order(sapply(LUSER, median, na.rm=T))
boxplot(LUSER[ord1], las=2)

percentNoChange<-sapply(LUSER, function(x)sum(x==0, na.rm=T)/length(x))*100
names(percentNoChange)<-paste0("Dr.", names(percentNoChange))
ord2<-order(percentNoChange)
bpp<-barplot(percentNoChange[ord2], las=2, main="7个答案全给一样分数的题目占比", ylab="%")
text(bpp, percentNoChange[ord2]+2, paste0(round(percentNoChange[ord2], 1), "%"), xpd=T)

par(mar=c(8, 4, 4, 2))
LCOR2<-LCOR[sapply(LCOR, length)>10]
LCOR2<-LCOR[sapply(LCOR2, function(x)sum(is.na(x)))<10]
ord2<-order(sapply(LCOR2, median, na.rm=T))
boxplot(LCOR2[ord2], las=2)

pdf("pairwise.reviewers.corr.pdf", height=16, width=20)
	par(mfrow=c(4, 2))
	for(i in 1:length(LCOR)){
		par(mar=c(3,5,2,2))
		#if(sum(!is.na(LCOR[[i]]))<10)
		x<-LCOR[[i]]
		indpoor<-which(x<0.3)
		corrspdDept<-corDept[[names(LCOR)[i]]]
		theseTypes<-factor(LTypes[[corrspdDept]])
		bpp<-barplot(x, main=paste0(corrspdDept, ": ", "DR", gsub("_", " vs. DR", names(LCOR)[i])), 
			ylab="一致性(Pearson's R)", cex.lab=2, cex.main=2,
			col=c(3,4)[theseTypes], 
			xlab="", family = "SimHei")
		if(length(indpoor)>0)
			text(bpp[indpoor], x[indpoor], paste0("第",indpoor,"题"), xpd=T, srt=90, cex=1.5, col="red")
		legend("bottomleft", fill=c(3,4), legend=c("OSCE", "realCases"))
	}
dev.off()

plot(1, xlim=c(0, max(sapply(LCOR, length))), ylim=c(-1,1), type='n')
sapply(LCOR, function(x){
	lines(x)
	mod1<-loess(x~seq(length(x)))
	lines(seq(length(x)), mod1$fitted, col="red", lwd=2)
	})


