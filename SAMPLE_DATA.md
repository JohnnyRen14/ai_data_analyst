# Example CSV Data for Testing

You can use these sample CSV files to test the AI Data Analytics Platform.

## Sample 1: Sales Data

Create a file named `sales_data.csv`:

```csv
date,product,category,revenue,quantity,region
2024-01-01,Laptop,Electronics,1200,2,North
2024-01-02,Mouse,Electronics,25,10,South
2024-01-03,Keyboard,Electronics,75,5,East
2024-01-04,Monitor,Electronics,300,3,West
2024-01-05,Laptop,Electronics,1200,1,North
2024-01-06,Desk,Furniture,450,2,South
2024-01-07,Chair,Furniture,200,4,East
2024-01-08,Mouse,Electronics,25,8,West
2024-01-09,Laptop,Electronics,1200,3,South
2024-01-10,Monitor,Electronics,300,2,North
```

**Use cases**: Revenue analysis, product performance, regional trends

## Sample 2: Customer Analytics

Create a file named `customer_data.csv`:

```csv
customer_id,age,gender,membership_level,total_purchases,avg_rating,last_purchase_days
101,25,M,Gold,5,4.5,10
102,34,F,Silver,3,4.2,25
103,45,M,Bronze,1,3.8,60
104,28,F,Gold,8,4.9,5
105,52,M,Silver,4,4.1,30
106,31,F,Gold,6,4.7,15
107,41,M,Bronze,2,3.5,90
108,29,F,Gold,7,4.8,8
109,38,M,Silver,3,4.0,40
110,26,F,Gold,9,4.9,3
```

**Use cases**: Customer segmentation, retention analysis, loyalty insights

## Sample 3: Marketing Campaign

Create a file named `marketing_data.csv`:

```csv
campaign_id,channel,impressions,clicks,conversions,cost,revenue
C001,Email,10000,500,50,100,1500
C002,Social,25000,1200,80,300,2400
C003,Search,15000,900,120,400,4800
C004,Display,30000,600,30,200,900
C005,Email,12000,550,60,120,1800
C006,Social,28000,1400,100,350,3000
C007,Search,18000,1100,150,450,6000
C008,Display,35000,700,40,250,1200
```

**Use cases**: ROI analysis, channel performance, conversion optimization

## Sample 4: Employee Performance

Create a file named `employee_data.csv`:

```csv
employee_id,department,years_experience,performance_score,projects_completed,training_hours,salary
E001,Engineering,5,85,12,40,75000
E002,Marketing,3,78,8,25,55000
E003,Sales,7,92,15,30,85000
E004,Engineering,2,72,6,35,50000
E005,Marketing,4,88,10,45,60000
E006,Sales,6,95,18,20,90000
E007,Engineering,8,90,20,50,95000
E008,Marketing,1,65,4,15,45000
E009,Sales,5,87,14,28,80000
E010,Engineering,3,80,9,38,58000
```

**Use cases**: Performance analysis, compensation planning, training effectiveness

## Tips for Testing

1. **Start Simple**: Use Sample 1 (Sales Data) for your first test
2. **Vary Size**: Create larger datasets by duplicating rows with slight variations
3. **Add Complexity**: Mix data types (numbers, text, dates) to test type inference
4. **Test Edge Cases**: Try files with missing values or special characters
5. **Real Data**: Use your own anonymized business data for best results

## Creating Custom Test Data

When creating your own test CSV files:

- Include a header row with column names
- Mix numeric and string columns
- Include date columns for time-series analysis
- Add some missing values to test data cleaning
- Keep files under 10MB for initial testing
