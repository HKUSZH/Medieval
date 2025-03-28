
load("scores.mar28.1130.RData")

library(showtext)

# Load Chinese fonttukey

showtext_auto()
font_add("SimHei", "SimHei.ttf")  # Use a Chinese font file

##################################
BARPLOT<-function(formula_str, DATAin, MAINtxt="", TYPEstr="", YLAB="", resiVar="ncharResi"){
	fit1<-lm(as.formula(formula_str), DATAin)

	SUFFIX<-gsub("(modelSuff|category)[0-9]*", "", names(fit1$coefficients))
	print(SUFFIX)
	COEF<-fit1$coefficients

	names(COEF)<-MODELS[SUFFIX]
	indMod<-which(SUFFIX %in% names(MODELS))

	MAINSTR<-paste0(MAINtxt, ":", TYPEstr,  " [", nrow(DATAin), "]")
	par(mar=c(2,5,3,2))
	ord1<-order(COEF[indMod])
	bpp<-barplot(COEF[indMod][ord1], las=2, names.arg = "", main=MAINSTR, ylab=YLAB)
	#mtext(TYPEstr)
	#text(bpp+0.25, -0.25, names(COEF[indMod][ord1]), srt=45, pos=2, xpd=T)
	text(bpp-0.125, 0.125, names(COEF[indMod][ord1]), srt=90, pos=4, xpd=T)
	ci<-as.matrix(confint(fit1))[indMod, , drop=F]
	print(ci)
	for(i in 1:length(bpp)){
		j<-ord1[i]
		lines(rep(bpp[i], 2), ci[j,1:2], xpd=T)
		lines(c(bpp[i]-0.25, bpp[i]+0.25),rep(ci[j,1], 2), xpd=T)
		lines(c(bpp[i]-0.25, bpp[i]+0.25),rep(ci[j,2], 2), xpd=T)
	}
	RES<-list()
	if(1){
		QueRev<-paste0(DATAin$theseQIDs, "_", DATAin$reviewer)
		#WINNERS<-split(DATAin[[resiVar]], QueRev)
		#WINNERS<-split(DATAin[[model]], QueRev)
		WINNERS<-split(DATAin[c(resiVar, "strength", "rank", "model", "len", "ncharrank")], QueRev)		
		#tab1<-table(WINNERS, paste0(unqthisRANK13$reviewer, "_", unqthisRANK13$qTypeij))
		print(WINNERS)
		RES[["WINNERtab"]]<-WINNERS
	}
	if(length(grep("nchar", formula_str))==0){
		fit4<-aov(as.formula(formula_str), DATAin)
		print(TukeyHSD(fit4))
		RES[["TukeyHSD"]]<-TukeyHSD(fit4)
	}
	return(RES)
}
#############################
GETRESI<-function(RANKin, formulaIn="rank~nchar", resiVar="ncharResi"){
	fit1<-lm(as.formula(formulaIn), RANKin)
	summary(fit1)
	ncharResi<-fit1$resi + mean(fit1$fitted)
	RANKin[[resiVar]]<-ncharResi
	return(RANKin)
}

##################################
##################################
pdf("model.comparison.overall.and.per.subject.mar28.pdf", height=12, width=15)
	for(k in 1:3){
		if(k==1){
			thisRANK<-RANK28pure
			TYPE<-"realCases + OSCE"
		}else if(k==2){
			thisRANK<-RANK28pure[RANK28pure$qTypeij=="realCases", ]
			TYPE<-"realCases"
		}else if(k==3){
			thisRANK<-RANK28pure[RANK28pure$qTypeij=="OSCE", ]
			TYPE<-"OSCE"
		}
	#############################
		par(mfrow=c(1,1))
		plot.new()
		text(0.5, 0.5, paste0("k=", k))
		par(mfrow=c(2,2))

		par(mar=c(4,4,2,2))
		boxplot(nchar~model , thisRANK, outline=F, las=2, xlab="", ylab="response length (num char)", main="for all data-points (10,278)")
		boxplot(strength~model, thisRANK, outline=F, las=2, xlab="", ylab="strength (0 to 10)", main="for all data-points (10,278)")
		par(mfrow=c(4,4))

		tab1<-table(thisRANK$thisDeptName)
		for(i in 1:length(tab1)){
			thisRANKi<-thisRANK[thisRANK$thisDeptName==names(tab1)[i], ]
			stri<-paste0("for [", names(tab1)[i],"] (", nrow(thisRANKi),")")
			boxplot(nchar~model, thisRANKi, outline=F, las=2, xlab="", ylab="response length (num char)", main=stri)
			boxplot(strength~model, thisRANKi, outline=F, las=2, xlab="", ylab="strength (0 to 10)", main=stri)
		}



	#############################
		par(mfrow=c(2,2))

		thisRANK2<-GETRESI(thisRANK, "rank~ncharrank", "ncharResi")
		BARPLOT("ncharResi~ modelSuff+ 0", thisRANK2, MAINtxt="all subjects w AE", TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")

		thisRANK13<-thisRANK[thisRANK$thisDeptName!="01.AE", ]
		thisRANK13<-GETRESI(thisRANK13, "rank~ncharrank", "ncharResi")

		BARPLOT("ncharResi~modelSuff+ 0", thisRANK13, MAINtxt="all subjects wo AE", TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")

		minNumCase<-min(sapply(split(seq(nrow(thisRANK)), thisRANK$thisDeptName), length))
		set.seed(0)
		indStrat<-sort(as.vector(sapply(split(seq(nrow(thisRANK)), thisRANK$thisDeptName), function(x)sort(sample(x, minNumCase)))))
		#plot(indStrat)
		thisRANK132<-thisRANK[indStrat, ]
		thisRANK132<-thisRANK132[thisRANK132$thisDeptName!="01.AE", ]
		thisRANK132<-GETRESI(thisRANK132, "rank~ncharrank", "ncharResi")
		BARPLOT("ncharResi~modelSuff+ 0", thisRANK132, MAINtxt="all wo AE (stratif)", TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")

#####
		minNumCase<-min(sapply(split(seq(nrow(thisRANK)), thisRANK$thisDeptName), length))
		set.seed(0)
		indStrat<-sort(as.vector(sapply(split(seq(nrow(thisRANK)), thisRANK$thisDeptName), function(x)sort(sample(x, minNumCase)))))
		#plot(indStrat)
		thisRANK132<-thisRANK[indStrat, ]
		thisRANK132<-GETRESI(thisRANK132, "rank~ncharrank", "ncharResi")
		BARPLOT("ncharResi~modelSuff+ 0", thisRANK132, MAINtxt="all w AE (stratif)", TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")

####
	#	BARPLOT("nchar~modelSuff + 0", thisRANK, TYPEstr=TYPE)
		tab1<-table(thisRANK$thisDeptName)

		par(mfrow=c(4,4))
		for(i in 1:length(tab1)){
			thisRANKi<-thisRANK[thisRANK$thisDeptName==names(tab1)[i], ]
			thisRANKi2<-GETRESI(thisRANKi, formulaIn="rank~ncharrank", resiVar="ncharResi")
			BARPLOT("ncharResi~modelSuff+ 0", thisRANKi2, MAINtxt=names(tab1)[i], TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")
		}

		par(mfrow=c(5,6))
		strDeptRev<-paste0(thisRANK$thisDeptName, ":", "DR", thisRANK$reviewer)
		tabRev<-table(strDeptRev)
		matWin<-as.data.frame(matrix(0, length(tabRev), 7))
		colnames(matWin)<-MODELS
		rownames(matWin)<-names(tabRev)
		for(i in 1:length(tabRev)){
			thisRANKi<-thisRANK[strDeptRev==names(tabRev)[i], ]
			thisRANKi2<-GETRESI(thisRANKi, formulaIn="rank~ncharrank", resiVar="ncharResi")
			#par(mar=c(8,4,4,2)); boxplot(thisRANKi2$ncharResi~thisRANKi2$model, las=2)
			#par(mar=c(8,4,4,2)); boxplot(thisRANKi2$ncharResi~thisRANKi2$theseQIDs, las=2)

			resBPLTi<-BARPLOT("ncharResi~modelSuff+ 0", thisRANKi2, MAINtxt=names(tabRev)[i], TYPEstr=TYPE, YLAB="\n扣除答案长度外rank分\n(不是原始分)", resiVar="ncharResi")
			tabi<-table(sapply(resBPLTi[[1]], function(x)x$model[which.max(x$ncharResi)]))
			matWin[i, names(tabi)]<-as.integer(tabi)
		}
		
	##########
	##########
		par(mfrow=c(2,2))

		BARPLOT("rank~modelSuff+ nchar + 0", thisRANK, MAINtxt="all subjects w AE", TYPEstr=TYPE, YLAB="\n原始分的rank分\n(未扣除答案长度因素)", resiVar="rank")

		thisRANK13<-thisRANK[thisRANK$thisDeptName!="01.AE", ]
		BARPLOT("rank~modelSuff+ nchar + 0", thisRANK13, MAINtxt="all subjects wo AE", TYPEstr=TYPE, YLAB="\n原始分的rank分\n(未扣除答案长度因素)", resiVar="rank")

		par(mfrow=c(4,4))
		tab1<-table(thisRANK$thisDeptName)
		for(i in 1:length(tab1)){
			thisRANKi<-thisRANK[thisRANK$thisDeptName==names(tab1)[i], ]
			BARPLOT("rank~modelSuff + nchar+ 0", thisRANKi, MAINtxt=names(tab1)[i], TYPEstr=TYPE, YLAB="\n原始分的rank分\n(未扣除答案长度因素)", resiVar="rank")
		}
	##########
	##########
		par(mfrow=c(2,2))

		BARPLOT("strength~modelSuff + nchar + 0", thisRANK, MAINtxt="all subjects w AE", TYPEstr=TYPE, YLAB="\n原始分\n(未扣除答案长度因素)", resiVar="strength")

		thisRANK13<-thisRANK[thisRANK$thisDeptName!="01.AE", ]
		BARPLOT("strength~modelSuff + nchar + 0", thisRANK13, MAINtxt="all subjects wo AE", TYPEstr=TYPE, YLAB="\n原始分\n(未扣除答案长度因素)", resiVar="strength")

		par(mfrow=c(4,4))
		tab1<-table(thisRANK$thisDeptName)
		for(i in 1:length(tab1)){
			thisRANKi<-thisRANK[thisRANK$thisDeptName==names(tab1)[i], ]
			BARPLOT("strength~modelSuff + nchar+ 0", thisRANKi, MAINtxt=names(tab1)[i], TYPEstr=TYPE, YLAB="\n原始分\n(未扣除答案长度因素)", resiVar="strength")
		}
	#########
	#########
		par(mfrow=c(2,2))
		fit1<-lm(strength~nchar, thisRANK)
		thisRANK2<-GETRESI(thisRANK, formulaIn="strength~nchar", resiVar="strengthResi")
		BARPLOT("strengthResi~modelSuff + 0", thisRANK2, MAINtxt="all subjects w AE", TYPEstr=TYPE, YLAB="\n扣除答案长度外的原始分\n(不是rank分)", resiVar="strengthResi")

		thisRANK13<-thisRANK[thisRANK$thisDeptName!="01.AE", ]
		thisRANK132<-GETRESI(thisRANK13, formulaIn="strength~nchar", resiVar="strengthResi")
		BARPLOT("strengthResi~modelSuff+ 0", thisRANK132, MAINtxt="all subjects wo AE", TYPEstr=TYPE, YLAB="\n扣除答案长度外的原始分\n(不是rank分)", resiVar="strengthResi")

		tab1<-table(thisRANK$thisDeptName)

		par(mfrow=c(4,4))
		for(i in 1:length(tab1)){
			thisRANKi<-thisRANK[thisRANK$thisDeptName==names(tab1)[i], ]
			thisRANKi2<-GETRESI(thisRANKi, formulaIn="strength~nchar", resiVar="strengthResi")
			BARPLOT("strengthResi~modelSuff+ 0", thisRANKi2, MAINtxt=names(tab1)[i], TYPEstr=TYPE, YLAB="\n扣除答案长度外的原始分\n(不是rank分)", resiVar="strengthResi")
		}


	}
dev.off()






