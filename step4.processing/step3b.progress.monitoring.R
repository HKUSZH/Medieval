library(jsonlite)
library(lubridate)
#library(showtext)

# Load Chinese fonttukey

#showtext_auto()
#font_add("SimHei", "SimHei.ttf")  # Use a Chinese font file

############################################
indepRev28<-c("白明珠", "陈健良", "陈益华", "仇威富", "崔立文", "崔玉真", "戴康临", "金珺", "邝冠明", "李向阳", 
	"罗力冰", "荣磊", "陶惠人", "王艳丽", "王赞鑫", "魏民新", "吴旻", "肖海兵", 
	"谢建生", "严玉兰", "杨军", "张谦慎", "赵丽娜", "周青山",  "王艳丽抢救室", "仇威富抢救室",
	"尹世杰", "吴南", "唐欣")

load("../scores.mar29.1230.RData")
source("../step1.helpers.R")

authors[["deptEng"]]<-deptEng[authors$dept]
authors[["name2"]]<-gsub("_", "", authors$name)
authorsIndep<-authors[authors$role=="reviewer", ]
authorsReviewer<-authors[authors$role %in% c("reviewer", "DQreviewer", "nonIndep_reviewer"), ]
authorsReviewer<-authorsReviewer[order(authorsReviewer$deptEng), ]
################
############################################
scoreSiles<-list.files(pattern="scores.*.json")
newFileNames<-gsub("_", ".", scoreSiles)
scoreSiles2<-scoreSiles[order(newFileNames)]

parsed_dates <- parse_date_time(sort(newFileNames), "b%d.%H%M", tz = "UTC", locale = "C")
time_differences <- difftime(parsed_dates, parsed_dates[1], units = "mins")
timeDiffHrs<-as.numeric(time_differences/60)
# Display results
data.frame(Timestamp = parsed_dates, Time_Diff_Mins = time_differences)


LTab<-list()
for(i in 1:length(scoreSiles2)){
	if(i%%10==0)cat(i, "\t")
	if(i%%60==0)cat(i, "\n")
	jsonData<- jsonlite::fromJSON(scoreSiles2[i])
	LUseri<-sapply(jsonData, function(x){
		sapply(x, function(y)y$user)
	})
	tabi<-table(unlist(LUseri))
	LTab[[i]]<-tabi
}
allReviewers<-unique(unlist(sapply(LTab, names)))

matProgress<-matrix(0, length(allReviewers), length(scoreSiles))
rownames(matProgress)<-allReviewers
for(i in 1:length(LTab)){
	tabi<-LTab[[i]]
	matProgress[names(tabi), i]<-as.integer(tabi)
}

matProgress2<-apply(matProgress, 1, function(x)x*100/max(x))

matplot(x=timeDiffHrs, matProgress2, type='b')
###############################
setdiff(authorsReviewer$name2, colnames(matProgress2))
indAuthors37<-match(authorsReviewer$name, colnames(matProgress2))
matProgress3<-matProgress2[, indAuthors37]
pdf("reviewer.progress.per.dept.mar29.pdf", width=12, height=7.5)
	UNQDept<-unique(authorsReviewer$deptEng)

	par(mfrow=c(3, 5))
	for(i in 1:length(UNQDept)){
		indi<-which(authorsReviewer$deptEng==UNQDept[i])
		authors.i<-authorsReviewer[indi,, drop=F]
		matProgressi<-matProgress3[, indi, drop=F]

		#####################################################
		t95<-timeDiffHrs[apply(matProgressi, 2, function(x)min(which(x>95)))]
		t5<-timeDiffHrs[apply(matProgressi, 2, function(x)max(which(x<5)))]
		len<-round(as.numeric(t95)-as.numeric(t5), 1)

		indFrom<-min(which(apply(matProgressi, 1, max)>5))
		indTo<-min(which(apply(matProgressi, 1, min)>95))
		indSel<-seq(indFrom, indTo)
		if(i==2){indSel<-seq(90, 128)}
		if(i==13){indSel<-seq(80, 96)}
		par(mar=c(4,2,2,2))
		matplot(x=timeDiffHrs[indSel], matProgressi[indSel, ], pch = 16, col = seq(ncol(matProgressi)), lty=1, lwd=2,
			xaxt = "n", ylab = "percentage progress (%, max 100)", xlab = "hours since first record", 
			main = "", type='l')
		axis(1, at = seq(0, round(max(as.numeric(timeDiffHrs[indSel]))), by=12), las=2)
		legend("topleft", legend=paste0(authors.i$deptEng, ":", authors.i$initials, " (",len, " hrs)"), lty=1, lwd=2, col=seq(29))

	}
dev.off()


###############################

ind28<- gsub("_", "", colnames(matProgress2)) %in% indepRev28
matProgress3<-matProgress2[, ind28]

authorsReviewer

pdf("reviewer.progress.pdf", width=20, height=9)
	matplot(x=timeDiffHrs, matProgress3, type='b')

	matplot(x=timeDiffHrs, matProgress3, pch = 16, col = 1:ncol(matProgress3), lty=1, lwd=2,
		xaxt = "n", ylab = "percentage progress (%, max 100)", xlab = "hours since first record", 
		main = "Progress monitoring", type='l')
	matplot(x=timeDiffHrs, matProgress3, pch = 16,  type='p', add =T)
	text(timeDiffHrs, matProgress3, labels = col(matProgress3), col = col(matProgress3), cex = 1.2)
	axis(1, at = seq(0, 380, by=5))
	legend("topleft", legend=paste0(seq(ncol(matProgress3)), ":", colnames(matProgress3)), lty=1, lwd=2, col=seq(29))

	#####################################################

	indSel<-c(12:13, 29)
	matplot(x=timeDiffHrs, matProgress3[, indSel], pch = 16, col = seq(ncol(matProgress3))[indSel], lty=1, lwd=2,
		xaxt = "n", ylab = "percentage progress (%, max 100)", xlab = "hours since first record", 
		main = "Progress monitoring", type='l')
	text(timeDiffHrs, matProgress3[, indSel], labels = col(matProgress3)[, indSel], 
		col = col(matProgress3[, indSel]), cex = 1.2)
	axis(1, at = seq(0, 380, by=5))
	legend("topleft", legend=paste0(seq(ncol(matProgress3)), ":", colnames(matProgress3)), lty=1, lwd=2, col=seq(29))

	#####################################################
	t95<-timeDiffHrs[apply(matProgress3, 2, function(x)min(which(x>95)))]
	t5<-timeDiffHrs[apply(matProgress3, 2, function(x)max(which(x<5)))]
	data.frame(reviewer=colnames(matProgress3), "5%到95%进度所花时间（hrs）" = round(as.numeric(t95)-as.numeric(t5), 1))


dev.off()

