# Data processing station

**Transform Data** is a web platform designed to simplify **ETL (Extract, Transform, Load)** processes, enabling users to perform data transformations in an intuitive, fast, and efficient way — without requiring advanced programming knowledge.

## 📌 About the project

This project was created with the goal of making data processing more accessible and productive, offering a user-friendly interface combined with a robust backend for data handling.

## Funcionalidades

- File upload (CSV, XLSX, etc.)
- Data cleaning and standardization
- Data transformation and pipeline operations
- Integration of multiple data sources
- Data structuring for analysis
- Client-side state persistence (localStorage)
- Export of transformed data

## 🧠 Architecture and Technologies

### Backend

-   Django\
-   MVC/MVT architecture

### Data Processing

-   Pandas\
-   openpyxl

### Frontend

-   JavaScript\
-   HTML & CSS (Bootstrap framework)

## How to run?

``` bash
git clone https://github.com/raisalomao/transform_data.git
cd transform_data
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
