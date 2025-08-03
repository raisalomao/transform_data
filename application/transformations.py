import pandas as pd
import numpy as np
import json

def sanitize_df(df):
    """
    Substitui valores NaN por None para garantir que a serialização para JSON seja válida.
    """
    return df.where(pd.notnull(df), None)

def add_new_column(df, column_name, default_value=""):
    """Adiciona uma nova coluna com um valor padrão."""
    df_copy = df.copy()
    df_copy[column_name] = default_value
    return df_copy

def change_column_type(df, column_name, new_type):
    """
    Altera o tipo de dado de uma coluna.
    Exemplos para new_type: 'int64', 'float64', 'str', 'datetime64[ns]'
    """
    df_copy = df.copy()
    if column_name not in df_copy.columns:
        return df_copy

    try:
        if new_type == 'datetime':
            df_copy[column_name] = pd.to_datetime(df_copy[column_name], errors='coerce')
        else:
            if new_type in ['int64', 'float64']:
                df_copy[column_name] = pd.to_numeric(df_copy[column_name], errors='coerce')
            df_copy[column_name] = df_copy[column_name].astype(new_type)
    except Exception as e:
        print(f"Erro em change_column_type para a coluna '{column_name}': {e}")
    return df_copy

def replace_values(df, column_name, value_to_replace, new_value):
    """Substitui um valor específico em uma coluna."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        df_copy[column_name] = df_copy[column_name].replace(value_to_replace, new_value)
    return df_copy

def drop_null_rows(df, subset_columns=None):
    """Remove linhas com valores nulos em colunas específicas."""
    df_copy = df.copy()
    if subset_columns:
        subset_columns = [col for col in subset_columns if col in df_copy.columns]
    return df_copy.dropna(subset=subset_columns if subset_columns else None)

def drop_column(df, column_name):
    """Remove uma ou mais colunas."""
    df_copy = df.copy()
    if not isinstance(column_name, list):
        column_name = [column_name]
    return df_copy.drop(columns=column_name, errors='ignore')

def filter_rows_by_value(df, column_name, value):
    """Remove linhas com base em um valor específico em uma coluna."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        try:
            if pd.api.types.is_numeric_dtype(df_copy[column_name]):
                value = type(df_copy[column_name].iloc[0])(value)
        except (ValueError, IndexError) as e:
            print(f"Erro ao converter o valor para a coluna '{column_name}': {e}")
        return df_copy[df_copy[column_name] != value]
    return df_copy

def change_case(df, column_name, case='upper'):
    """Altera o case de uma coluna de texto: 'upper', 'lower', 'title'."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        if case == 'upper':
            df_copy[column_name] = df_copy[column_name].astype(str).str.upper()
        elif case == 'lower':
            df_copy[column_name] = df_copy[column_name].astype(str).str.lower()
        elif case == 'title':
            df_copy[column_name] = df_copy[column_name].astype(str).str.title()
    return df_copy

def drop_duplicates(df, subset_columns=None):
    """Remove linhas duplicadas, considerando todas ou um subconjunto de colunas."""
    df_copy = df.copy()
    if subset_columns:
        subset_columns = [col for col in subset_columns if col in df_copy.columns]
    return df_copy.drop_duplicates(subset=subset_columns if subset_columns else None)

def conditional_column(df, new_column_name, base_column, conditions, default_value):
    """Cria uma coluna com base em condições em outra coluna."""
    df_copy = df.copy()
    if base_column not in df_copy.columns:
        return df_copy

    df_copy[base_column] = pd.to_numeric(df_copy[base_column], errors='coerce')
    conditions_list = []
    values_list = []
    
    for item in conditions:
        try:
            op_map = {
                '>':  (lambda c, v: c > v),
                '<':  (lambda c, v: c < v),
                '>=': (lambda c, v: c >= v),
                '<=': (lambda c, v: c <= v),
                '==': (lambda c, v: c == v),
                '!=': (lambda c, v: c != v)
            }
            
            parts = item['condition'].split()
            if len(parts) < 2:
                continue
            op_str = parts[0]
            val = float(parts[1])
            
            conditions_list.append(op_map.get(op_str, lambda c,v: False)(df_copy[base_column], val))
            values_list.append(item['value'])
        except Exception as e:
            print(f"Erro ao aplicar condição em conditional_column: {e}")
            continue

    df_copy[new_column_name] = np.select(conditions_list, values_list, default=default_value)
    return df_copy

def extract_from_date(df, column_name):
    """Cria colunas de Ano, Mês e Dia a partir de uma coluna de data."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        date_series = pd.to_datetime(df_copy[column_name], errors='coerce')
        df_copy[f'Ano{column_name}'] = date_series.dt.year
        df_copy[f'Mês{column_name}'] = date_series.dt.month
        df_copy[f'Dia{column_name}'] = date_series.dt.day
    return df_copy

def split_by_delimiter(df, column_name, delimiter, new_column_names):
    """Divide uma coluna em várias colunas com base em um delimitador."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        split_data = df_copy[column_name].astype(str).str.split(delimiter, expand=True)
        for i, col_name in enumerate(new_column_names):
            if i < split_data.shape[1]:
                df_copy[col_name] = split_data[i]
            else:
                df_copy[col_name] = None
    return df_copy

def group_by(df, group_by_columns, aggregations):
    """
    Agrupa o DataFrame por uma ou mais colunas e aplica agregações.
    `group_by_columns` deve ser uma lista de colunas.
    `aggregations` deve ser um dicionário onde as chaves são colunas e os valores são funções de agregação.
    Exemplo: {'col1': 'sum', 'col2': 'mean'}
    """
    df_copy = df.copy()
    return df_copy.groupby(group_by_columns).agg(aggregations).reset_index()


OPERATIONS_MAP = {
    'add_new_column': add_new_column,
    'change_column_type': change_column_type,
    'replace_values': replace_values,
    'drop_null_rows': drop_null_rows,
    'drop_column': drop_column,
    'filter_rows_by_value': filter_rows_by_value,
    'change_case': change_case,
    'drop_duplicates': drop_duplicates,
    'conditional_column': conditional_column,
    'extract_from_date': extract_from_date,
    'split_by_delimiter': split_by_delimiter,
    'group_by': group_by,
}

def apply_transformations(df, steps):
    """
    Aplica uma lista de etapas de transformação a um DataFrame e garante que os dados
    possam ser convertidos para JSON sem erros (substituindo NaN por null).
    """
    transformed_df = df.copy()
    for step in steps:
        operation = step.get('operation')
        params = step.get('parameters', {})
        
        if operation in OPERATIONS_MAP:
            func = OPERATIONS_MAP[operation]
            try:
                transformed_df = func(transformed_df, **params)
            except Exception as e:
                print(f"Erro ao aplicar '{operation}' com parâmetros {params}: {e}")
                continue
        else:
            print(f"Aviso: Operação '{operation}' não reconhecida.")
    
    transformed_df = sanitize_df(transformed_df)
    return transformed_df