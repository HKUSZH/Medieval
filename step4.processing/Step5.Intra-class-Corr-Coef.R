library(lme4)
library(ggplot2)
library(io)
library(ggpubr)

# load SUMMARY, SCORES3, and MODELS
load("scores.mar30.1530.RData")

# remove suffixes from user names, because three reviewers
# have multiple accounts
SUMMARY$name <- sub("_.*", "", SUMMARY$name);
SCORES3$user <- sub("_.*", "", SCORES3$user);

reviewers <- unique(SUMMARY$name[SUMMARY$role == "reviewer"]);
length(reviewers)

props <- transmute(
  RANK28pure,
  question = theseQIDs,
  model = model,
  #type = qTypeij,
  rlen_rank = factor(ncharrank)
);
props <- props[!duplicated(props), ];
nrow(props)

# data frame of raw scores
d0 <- SCORES3;

table(d0$AID)
table(d0$dept)

# remove prefix of AID, which is a random sequence used for
# blinding purposes
d0$AID <- sub("[^-]+-", "", d0$AID);

d0 <- d0[d0$user %in% reviewers, ];

map_specialty <- function(x) {
  factor(x,
    levels = c(
      "骨科", "产前诊断", "儿科",
      "神内科", "心内科", "肾内科",
      "呼吸内科", "新生儿科", "罕见病",
      "心外科", "小儿外科",
      "急诊", "ICU重症","急诊抢救室"
    ),
    labels = c(
      "Orthopedics", "Gynecology", "Pediatrics",
      "Neurology", "Cardiology" , "Nephrology",
      "Pulmonology", "Newborn", "RareDiseases",
      "CardiacSurgery", "PediatricSurgery",
      "Emergency", "EmergencyRoom", "ICU"
    )
  )
}


d0$dept_english <- map_specialty(d0$dept);
d0$model_id <- MODELS[d0$AID];

# each subject is a question-response combination
d <- transmute(d0,
  model = model_id,
  question = QID,
  specialty = dept_english,
  response = paste(QID, AID, sep="."),
  rater = user,
  score = strength
);
nrow(d)

d <- left_join(d, props);
nrow(d)

# number of questions
length(unique(d0$QID))

# number of models for answering the questions
length(unique(d0$AID))

# number of possible question-model response combinations
length(unique(d0$QID)) * length(unique(d0$AID))

# number of question-model response combinations
length(unique(d$response))

length(unique(d$rater))

# each rater rated different number of responses
table(d$rater)
mean(table(d$rater))
# 365

# ---

# Calculate various intraclass correlation coefficients (ICC).
# poor: ICC < 0.5
# moderate: 0.5 < ICC < 0.75
# good: 0.75 < ICC < 0.9
# excellent: ICC > 0.9
# @see Ten Hove 2025, https://doi.org/10.1080/00273171.2025.2507745
# @param lmer object with "subject" fitted as a random effects
intraclass_cor <- function(fit, d) {
  # extract variance terms
  vcov.d <- as.data.frame(VarCorr(fit));
  sigma2 <- vcov.d$vcov;
  names(sigma2) <- vcov.d$grp;
  
  # ICC(A, 1)
  icc.a.1 <- sigma2["subject"] / sum(sigma2);
  
  # ICC(C, 1)
  icc.c.1 <- sigma2["subject"] / (sigma2["subject"] + sigma2["Residual"]);
  
  # \hat{k} = (\frac{\sum_s k_s^{-1}}{S})^{-1},
  # where k_s is the number of raters per subject s
  k <- table(d$subject);
  S <- length(k);
  k.hat <- S / sum(1/k);
  
  # ICC(A, \hat{k})
  icc.a.khat <- sigma2["subject"] / 
    (sigma2["subject"] + (sigma2["rater"] + sigma2["Residual"])/k.hat );
  
  list(
    S = S,
    k = k,
    k.hat = k.hat,
    sigma2 = sigma2,
    "ICC(A, 1)" = icc.a.1,
    "ICC(C, 1)" = icc.c.1,
    "ICC(A, k.hat)" = icc.a.khat
  )
}

cast_to_matrix <- function(d, x.var, y.var, value.var, fun=mean) {
  x <- d[[x.var]];
  y <- d[[y.var]];
  value <- d[[value.var]];
  # construct dense matrix
  x.vals <- unique(x);
  y.vals <- unique(y);
  dimnames <- list(x.vals, y.vals);
  names(dimnames) <- c(x.var, y.var);
  mat <- matrix(NA,
    nrow=length(x.vals),
    ncol=length(y.vals),
    dimnames=dimnames
  );
  # handle multiple values for the same key
  values <- list();
  keys <- paste(x, y, sep=".");
  for (i in 1:nrow(d)) {
    existing <- values[[ keys[i] ]];
    if (is.null(existing)) {
      values[[ keys[i] ]] <- value[i];
    } else {
      values[[ keys[i] ]] <- c(existing, value[i]);
    }
  }
  # aggregate multiple values
  for (i in 1:nrow(d)) {
    # repeated combinations will be overwritten
    mat[x[i], y[i]] <- fun(values[[ keys[i] ]]);
  }
  mat
}

# ---

# both subjects and raters are randomly chosen from bigger populations
# therefore, we use the two-way model

d$subject <- d$response;
fit.response <- lmer(score ~ (1 | subject) + (1 | rater), data = d);
fit.response

icc.response <- intraclass_cor(fit.response, d);
icc.response
# low ICC(A, 1) and low ICC(C, 1) collectively indicate
# that single ratings are neither in agreement or consistent
# ICC(A, k.hat) is also low, so even average rating has low reliability 
# for each question, which is rated by an average of 2 raters

# ---

# determine required sample size based on standard errors of the random effects
# estimated by the linear mixed effects model

# average number of raters to achieve ICC(A, k.hat) > 0.9
icc.response$sigma2

k.hats <- 1:50;

icc.a.khats <- with(icc.response,
  sigma2["subject"] / 
  (sigma2["subject"] + (sigma2["rater"] + sigma2["Residual"])/k.hats )
);

min.khat <- k.hats[which(icc.a.khats > 0.9)][1];
min.khat
# need k.hat >= 20 for ICC(A, k.hat) > 0.9

icc.response$k.hat
min.khat / icc.response$k.hat
# currently, k.hat \approx 2, so we need 10x more responses (10,000 -> 100,000)
rater.counts <- table(d$rater);
mean(rater.counts)
quantile(as.integer(rater.counts), c(0.05/2, 1 - 0.05/2))
# each rater evaluates about 340 (range 140-749) questions
# therefore, we need each rater to evaluate 10x more model responses
# (3400 questions on average)
# or we need 10x more raters (30 -> 300)

# ---

d$subject <- d$model;
fit.model <- lmer(score ~ (1 | subject) + (1 | rater), data = d);
fit.model

icc.model <- intraclass_cor(fit.model, d)
icc.model
# ICC(A, k.hat) = 0.995
# average ratings of responses by the models across questions within a 
# each specialty have excellent reliability

# given the low reliability of ratings for each question-model combination,
# we now look into the reliability of the average ratings of the models
# across questions within each specialty

# ---

d$subject <- d$specialty;
fit.specialty <- lmer(score ~ (1 | subject) + (1 | rater), data = d);
fit.specialty

icc.specialty <- intraclass_cor(fit.specialty, d)
icc.specialty
# ICC(A, k.hat) = 0.970
# ICC(A, k.hat) = 0.759  after  merging duplicate reviewers
# average ratings of each model have excellent reliability in absolute agreement

# ---

iccs <- NULL;
iccs <- c(iccs, "single ratings" = unname(icc.response[["ICC(A, 1)"]]));
iccs <- c(iccs, "averaged ratings, response level" = unname(icc.response[["ICC(A, k.hat)"]]));
iccs <- c(iccs, "averaged ratings, specialty level" = unname(icc.specialty[["ICC(A, k.hat)"]]));
iccs <- c(iccs, "averaged ratings, model level" = unname(icc.model[["ICC(A, k.hat)"]]));

d.icc <- data.frame(
  type = factor(names(iccs), levels=rev(names(iccs))),
  value = iccs
);
qdraw(
  ggplot(d.icc, aes(type, value)) +
    theme_classic() +
    geom_point() +
    geom_segment(aes(x=type, y=0, yend=value)) +
    coord_flip() +
    xlab("") + ylab("intraclass correlation coefficient")
  ,
  width = 5, height = 2,
  file = "icc.pdf"
)
  
# Conclusions

# At the single rating level, the absolute agreement among raters is low, suggesting that single ratings are not reliable.
# At the average rating level, the absolute agreement among raters for each model
# is excellent, where ICC(A, \hat{k}) = 0.995.
# Furthermore, the absolute agreement among raters for each model's responses
# within each specialty is also excellent, where ICC(A, \hat{k}) = 0.970.

# ---

library(psych)

# assess internal consistencies of the questions
question.model <- cast_to_matrix(d, "question", "model", "score");

# Cronbach's alpha
psych::alpha(question.model)
# 0.89 (0.87 - 0.9)

# each rater only rates within one specialty
specialty.rater <- cast_to_matrix(d, "specialty", "rater", "score");
specialty.rater

# ---

fit0 <- lmer(score ~ (1 | question) + (1 | rater), data=d);
fit1 <- lmer(score ~ model + (1 | question) + (1 | rater), data=d);
fit2 <- lmer(score ~ model + specialty + (1 | question) + (1 | rater), data = d);
fit3 <- lmer(score ~ model + model:specialty + (1 | question) + (1 | rater), data = d);
fit4 <- lmer(score ~ model + model:specialty + rlen_rank + (1 | question) + (1 | rater), data = d);
anova.res <- anova(fit0, fit1, fit2, fit3, fit4);

anova.res

fit4

# NB  fitting model:specialty (interaction only) vs.
#             model*speciality (marginal + interaction) uses
#     the same number of parameters!

# plot results
d.anova <- data.frame(
  model = c("baseline", "+ llm_model", "+ specialty", "+ llm_model:specialty", "+ rlen_rank"),
  llike_change = anova.res$logLik - anova.res$logLik[1],
  p = anova.res[["Pr(>Chisq)"]]
);
d.anova$model <- factor(d.anova$model, levels=rev(d.anova$model));
d.anova$p_label <- ifelse(d.anova$p < 2e-16,
  "p < 2e-16",
  ifelse(d.anova$p < 0.001,
    sprintf("p = %s", format(d.anova$p, scientific=TRUE, digits=2)),
    sprintf("p = %s", format(round(d.anova$p, digits=3), scientific=FALSE))
  )
);

qdraw(
  ggplot(d.anova, aes(model, llike_change)) +
    theme_classic() +
    geom_col() +
    coord_flip() +
    xlab("") + ylab("change in log likelihood") +
    ylim(0, max(d.anova$llike_change) * 1.4) +
    stat_pvalue_manual(
      data = data.frame(
        group1 = d.anova$model[-1],
        group2 = d.anova$model[-nrow(d.anova)],
        p = d.anova$p_label[-1],
        y.position = d.anova$llike_change[-1] * 1.1
      ),
      size = 3,
      bracket.shorten = 0.1,
      bracket.nudge.y = 0.2,
      step.increase = 0,
      trip.length = 0.02,
      vjust = 2,
      hjust = -0.2
    )
  ,
  width = 5, height = 2,
  file = "model-comparison.pdf"
)

# ---

d$score_lt_4 <- d$score < 4;

d$subject <- d$model;
fit.lscore.model <- lmer(score_lt_4 ~ (1 | subject) + (1 | rater), data = d);
fit.lscore.model

intraclass_cor(fit.lscore.model, d)
# 0.982


d$subject <- d$specialty;
fit.lscore.specialty <- lmer(score_lt_4 ~ (1 | subject) + (1 | rater), data = d);
fit.lscore.specialty

intraclass_cor(fit.lscore.model, d)
# 0.959

# ---

d$score_gt_8 <- d$score > 8;

d$subject <- d$model;
fit.hscore.model <- lmer(score_gt_8 ~ (1 | subject) + (1 | rater), data = d);
fit.hscore.model

intraclass_cor(fit.hscore.model, d)
# 0.985


d$subject <- d$specialty;
fit.hscore.specialty <- lmer(score_gt_8 ~ (1 | subject) + (1 | rater), data = d);
fit.hscore.specialty

intraclass_cor(fit.hscore.model, d)
# 0.965

# ---

sum(!is.na(d0$hallucination))


h <- transmute(d0,
  model = model_id,
  question = QID,
  specialty = dept_english,
  response = paste(QID, AID, sep="."),
  rater = email,
  score = hallucination
);
h$score[is.na(h$score)] <- 0;

h.s <- group_by(h, question, model) %>%
  dplyr::summarize(score = max(score));

sum(h.s$score >= 0)
  

h$subject <- h$model;
h.fit.model <- lmer(score ~ (1 | subject) + (1 | rater), data = h);
h.fit.model

intraclass_cor(h.fit.model, h)
# 0.942

h$subject <- h$specialty;
h.fit.specialty <- lmer(score ~ (1 | subject) + (1 | rater), data = h);
h.fit.specialty

intraclass_cor(h.fit.specialty, h)
# 0.948

h.fit0 <- lmer(score ~ (1 | question) + (1 | rater), data=h);
h.fit1 <- lmer(score ~ model + (1 | question) + (1 | rater), data=h);
h.fit2 <- lmer(score ~ model + specialty + (1 | question) + (1 | rater), data = h);
h.fit3 <- lmer(score ~ model + model:specialty + (1 | question) + (1 | rater), data = h);
h.anova.res <- anova(h.fit0, h.fit1, h.fit2, h.fit3);

h.anova.res

h.fit3

# ---

library(lmerTest)

#fit <- lmer(score ~ 0 + model + model:specialty + rlen_rank + (1 | question) + (1 | rater), data = d);
fit <- lmer(score ~ 0 + model + rlen_rank + (1 | question) + (1 | rater), data = d);
fit
fit.summary <- summary(fit, ddf = "Satterthwaite");
coefs <- fit.summary$coefficients;
coefs <- coefs[grep("model", rownames(coefs)), ];

alpha <- 0.20;
t.mult <- qt(p = 1 - alpha/2, df = coefs[, "df"]);

model.coefs <- data.frame(
  model = sub("model", "", rownames(coefs)),
  estimate = coefs[, 1],
  se = coefs[, 2],
  lower = coefs[, 1] + t.mult * coefs[, 2],
  upper = coefs[, 1] - t.mult * coefs[, 2]
);

write.table(model.coefs, "adjusted-model-scores.csv", sep=",", row.names=FALSE);

