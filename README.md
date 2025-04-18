# Data_Band

Abdul Karim Mouakeh 393729

Nadine Alfadelraad 395802

Jean-Daniel Rouveyrol 301480

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

# Milestone 1:

## Dataset:

For this project, we decided on the Fraud Detection Transactions dataset from Kaggle. It has 50,000 labeled transactions, each labeled as fraudulent (1) or non-fraudulent (0). The dataset encompasses a wide range of different and important attributes such as:

1. Transaction Details: Transaction ID, User ID, Transaction Type (POS, ATM Withdrawal, Online), and Transaction Amount.
2. Account and User Details: Account Balance, Card Type, Card Age, Authentication Type, and Device Type.
3. Fraud Risk Indicators: Prior Fraudulent Activity, IP Flag, Daily Transaction Volume, Risk Score.
4. Contextual Information: Location, Merchant Type, Timestamps, Distance of Transaction, and whether the transaction occurred on a Weekend.

With regards to the dataset, it is well organized and only requires slight preprocessing which we will address in the Exploratory Data Analysis section.

Dataset: https://www.kaggle.com/datasets/samayashar/fraud-detection-transactions-dataset

## Problematic:

Using this dataset, we aim to incorporate visualization techniques that help us in analyzing fraudulent transactions and pinpointing major risk determinants and trends. We will try to tackle the following questions:

1. Which types of transactions (POS, ATM withdrawals, online transfers) are most prone to fraud?
2. Do fraudulent transactions have lower or higher values compared to non-fraudulent transactions?
3. Does the fraud rate depend on time? (Time of the day, day of the week)
4. What is the correlation between risk score and probability of fraud?
5. Are there certain user behaviors (e.g. numerous failed transactions, high volume of daily transactions) that can be classified as indicators of fraud?

Fraud is an ongoing financial security issue and it’s becoming more and more prominent. The impact that fraudulent transactions have on the financial industry is very significant. Therefore, understanding fraud patterns through the use of data visualization will provide new insights that traditional fraud detection techniques (e.g., machine learning) lack. These new insights can contribute to the development of newer and more effective preventive strategies.

Our target audience includes financial analysts, cybersecurity professionals, and the general public as raising awareness about how fraud might occur during transactions is important for prevention and better decision-making.

## Exploratory Data Analysis:

We started off by first loading the dataset containing all 50,000 entries and 21 features (consisting of financial, temporal, behavioral, and categorical data). All the transactions are flagged as either fraudulent or legitimate (in the Fraud_Label column). This dataset has no missing values and consists of different data types like integers, floats, categorical variables, and timestamps.

In this stage, we converted the Timestamp column to a datetime format to facilitate time series visualizations. Using both `df.info()` and `df.describe()`, we obtained key statistics like the mean, the min, the max, and the std. For example, we found the average transaction amount is approximately 99.4, while account balances average around 50,000, and a wide variance in multiple features.

Analyzing the categorical data, it was apparent that POS and Online transactions are the most frequent transaction types, each accounting for around 25%. For the devices, Tablets were used in 33% of transactions, followed by Mobile and Laptop usage. The most common location for transactions was Tokyo then followed by Mumbai.

We applied a correlation matrix that showed us the relationships between features. One of the significant findings was a moderate positive correlation (0.51) between Failed_Transaction_Count_7d and Fraud_Label, which indicates that users with more failed transactions in the past week are more likely to be linked with fraud. The Risk_Score also showed a moderate correlation of 0.38 with fraudulent activity. Other variables, such as Transaction_Amount and Transaction_Distance, displayed weak correlations with the fraud label, suggesting that fraudulent behavior is more behaviorally driven than purely financial. (All to be looked further into)

*Note: This is a summarized version of our findings. The full EDA is available in the Notebook.*

## Related Work

This paper [Visualisation Tool to Support Fraud Detection](https://cdv.dei.uc.pt/wp-content/uploads/2021/09/silva2021fraud.pdf) porposes different approaches to visualize fraud detection. Its main goal is to come up with a tool to allow humans to check outputs of automatic fraud detection tools as it may be critical to not commit errors when racting to fraud. Heatmaps and shading matrices are used to display calendar view to identify activity patterns, circular views to underline periodicity in the data and finally a detailed view is proposed to compare transactions of interest atrribute by attribute.

The ["yworks" website](https://www.yworks.com/pages/fraud-detection-through-visualization) focuses more on the transaction graph. Even if techniques they employs may either requires more data processing either adaptation to our dataset, a dynamic (bipartite) graph view of our transcation may enable finer data exploration. (In a dynamic fashion of [this kind](https://www.researchgate.net/figure/Bipartite-graphs-for-MNP-bacteria-interrelationships-at-a-class-and-b-phylum_fig2_282241955) of graph visualization.)

Lastly, in this paper [ATOVis – A visualisation tool for the detection of financial fraud](https://journals.sagepub.com/doi/10.1177/14738716221098074?icid=int.sj-abstract.similar-articles.9), the authors try also to make a tool to accelerate and ease the fraud detection. They seem to use same idea of cricular views but with a different approach for the pattern identification.

In this project, we will try to use and adapt these techniques to our dataset, to focus on understanding fraud patterns early in the analysis pipeline using dashboards, and time series visualizations to detect fraud trends and understanding specific behaviour patterns behind these trends.


# Milestone 2 (18th April, 5pm)

# Milestone 3
