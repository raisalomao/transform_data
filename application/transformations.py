import pandas as pd
import numpy as np
import json

def format_date_columns(df):
    """
    Formata colunas de data (incluindo timestamps numéricos) para o formato 'DD/MM/YYYY'.
    """
    df_copy = df.copy()

    for col in df_copy.columns:
        if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
            try:
                df_copy[col] = pd.to_datetime(df_copy[col]).dt.strftime('%d/%m/%Y')
            except Exception as e:
                print(f"Aviso: Não foi possível formatar a coluna de data '{col}': {e}")
                
        elif pd.api.types.is_numeric_dtype(df_copy[col]) and not df_copy[col].isnull().all():
            try:
                if df_copy[col].max() > 1000000000:
                    dates_converted = pd.to_datetime(df_copy[col], unit='ms', errors='coerce')
                    if dates_converted.notna().sum() / len(dates_converted) > 0.5:
                        df_copy[col] = dates_converted.dt.strftime('%d/%m/%Y')
            except Exception as e:
                pass
                
    return df_copy

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

def remove_rows_by_value(df, column_name, value):
    """Remove linhas com base em um valor específico em uma coluna."""
    df_copy = df.copy()
    if column_name not in df_copy.columns:
        return df_copy

    if not isinstance(value, list):
        value = [value]

    try:
        return df_copy[~df_copy[column_name].isin(value)]
    except Exception as e:
        print(f"Erro em remove_rows_by_value para a coluna '{column_name}': {e}")
        return df_copy

def filter_rows_by_value(df, column_name, value):
    """
    Filtra o DataFrame para MANTER apenas as linhas onde a coluna contém o valor.
    A função agora usa lógica de "contains", como em um filtro do Excel.
    """
    df_copy = df.copy()
    if column_name not in df_copy.columns:
        return df_copy
    
    if not isinstance(value, list):
        value = [value]
    
    pattern = '|'.join([str(v) for v in value])
    
    try:
        return df_copy[df_copy[column_name].astype(str).str.contains(pattern, case=False, na=False)]
    except Exception as e:
        print(f"Erro em filter_rows_by_value para a coluna '{column_name}': {e}")
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

def trim_spaces(df, column_name):
    """Remove espaços em branco do início e fim de uma coluna de texto."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        df_copy[column_name] = df_copy[column_name].astype(str).str.strip()
    return df_copy

def rename_column(df, old_name, new_name):
    """Renomeia uma coluna."""
    df_copy = df.copy()
    if old_name not in df_copy.columns:
        print(f"Aviso: Coluna '{old_name}' não encontrada para renomear.")
        return df_copy
    if new_name in df_copy.columns:
        print(f"Aviso: Novo nome '{new_name}' já existe.")
        return df_copy
    
    return df_copy.rename(columns={old_name: new_name})

def add_prefix(df, column_name, prefix):
    """Adiciona um prefixo aos valores de uma coluna."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        df_copy[column_name] = str(prefix) + df_copy[column_name].astype(str)
    return df_copy

def add_suffix(df, column_name, suffix):
    """Adiciona um sufixo aos valores de uma coluna."""
    df_copy = df.copy()
    if column_name in df_copy.columns:
        df_copy[column_name] = df_copy[column_name].astype(str) + str(suffix)
    return df_copy

def drop_duplicates(df, subset_columns=None):
    """Remove linhas duplicadas, considerando todas ou um subconjunto de colunas."""
    df_copy = df.copy()
    if subset_columns:
        subset_columns = [col for col in subset_columns if col in df_copy.columns]
    return df_copy.drop_duplicates(subset=subset_columns if subset_columns else None)

def conditional_column(df, new_column_name, clauses, default_value):
    """
    Cria uma nova coluna com base em múltiplas cláusulas condicionais.
    """
    df_copy = df.copy()
    conditions_list = []
    values_list = []

    op_map = {
        '>': lambda col, val: pd.to_numeric(col, errors='coerce') > pd.to_numeric(val, errors='coerce'),
        '<': lambda col, val: pd.to_numeric(col, errors='coerce') < pd.to_numeric(val, errors='coerce'),
        '>=': lambda col, val: pd.to_numeric(col, errors='coerce') >= pd.to_numeric(val, errors='coerce'),
        '<=': lambda col, val: pd.to_numeric(col, errors='coerce') <= pd.to_numeric(val, errors='coerce'),
        '==': lambda col, val: col.astype(str) == str(val),
        '!=': lambda col, val: col.astype(str) != str(val),
        'contains': lambda col, val: col.astype(str).str.contains(str(val), case=False, na=False),
        'starts_with': lambda col, val: col.astype(str).str.startswith(str(val), na=False)
    }

    for clause in clauses:
        if_column = clause.get('if_column')
        operator = clause.get('operator')
        value_to_compare = clause.get('value')
        then_value = clause.get('then_value')

        if not all([if_column, operator, value_to_compare is not None, then_value is not None]) or if_column not in df_copy.columns:
            continue

        if operator in op_map:
            condition = op_map[operator](df_copy[if_column], value_to_compare)
            conditions_list.append(condition)
            values_list.append(then_value)

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

def split_date_time(df, column_name, new_date_column_name, new_time_column_name):
    """
    Divide uma coluna com data e hora em duas novas colunas: uma para a data e outra para a hora.
    A data é formatada no padrão DD/MM/YYYY.
    """
    df_copy = df.copy()
    if column_name not in df_copy.columns:
        print(f"Aviso: Coluna '{column_name}' não encontrada para dividir.")
        return df_copy
    
    try:
        date_series = pd.to_datetime(df_copy[column_name], errors='coerce', unit='ms')

        df_copy[new_date_column_name] = date_series.dt.strftime('%d/%m/%Y')
        df_copy[new_time_column_name] = date_series.dt.strftime('%H:%M:%S')

        return df_copy
    except Exception as e:
        print(f"Erro em split_date_time para a coluna '{column_name}': {e}")
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

def merge_columns(df, columns_to_merge, delimiter, new_column_name):
    """
    Mescla duas ou mais colunas em uma nova coluna,
    separadas por um delimitador.
    """
    df_copy = df.copy()
    valid_columns = [col for col in columns_to_merge if col in df_copy.columns]
    
    if len(valid_columns) < 2:
        print(f"Aviso: Pelo menos duas colunas válidas são necessárias para mesclar.")
        return df_copy

    if not new_column_name:
        print(f"Aviso: Um nome para a nova coluna é necessário.")
        return df_copy
    df_copy[new_column_name] = df_copy[valid_columns].astype(str).agg(delimiter.join, axis=1)
    
    return df_copy

def group_by(df, group_by_columns, aggregations):
    """
    Agrupa o DataFrame e aplica agregações nomeadas.
    """
    df_copy = df.copy()
    
    if not group_by_columns:
        return df_copy

    if not aggregations:
        return df_copy[group_by_columns].drop_duplicates().reset_index(drop=True)

    named_agg_dict = {}
    for agg_rule in aggregations:
        col_to_agg = agg_rule.get('column_to_aggregate')
        op = agg_rule.get('operation')
        new_col = agg_rule.get('new_column_name')
        
        if not all([col_to_agg, op, new_col]):
            continue
        
        named_agg_dict[new_col] = (col_to_agg, op)

    
    if not named_agg_dict:
        return df_copy[group_by_columns].drop_duplicates().reset_index(drop=True)
    try:
        grouped_df = df_copy.groupby(group_by_columns, as_index=False).agg(**named_agg_dict) 
        return grouped_df

    except Exception as e:
        print(f"Erro no group_by: {e}")
        return df_copy

def reorder_columns(df, column_order):
    """
    Reordena as colunas do DataFrame para a ordem especificada.
    """
    df_copy = df.copy()
    existing_columns = [col for col in column_order if col in df_copy.columns]
    return df_copy[existing_columns]

def sort_column(df, column_names, direction='asc'):
    """
    Ordena o DataFrame por uma ou mais colunas em uma direção específica.
    """
    df_copy = df.copy()

    if not isinstance(column_names, list):
        column_names = [column_names]
    
    valid_columns = [col for col in column_names if col in df_copy.columns]
    if not valid_columns:
        print(f"Aviso: Nenhuma das colunas {column_names} foi encontrada para ordenar.")
        return df_copy
    
    is_ascending = (direction == 'asc')
    return df_copy.sort_values(by=valid_columns, ascending=is_ascending).reset_index(drop=True)

def duplicate_column(df, column_to_duplicate, new_column_name):
    """
    Duplica uma coluna existente. Se new_column_name for omitido,
    gera um nome automático (ex: 'Coluna - Copiar', 'Coluna - Copiar (1)').
    """
    df_copy = df.copy()

    if column_to_duplicate not in df_copy.columns:
        print(f"Aviso: Coluna '{column_to_duplicate}' não encontrada para duplicar.")
        return df_copy

    if new_column_name:
        if new_column_name in df_copy.columns:
            print(f"Aviso: Nome da nova coluna '{new_column_name}' já existe.")
            return df_copy
    else:
        
        base_name = f"{column_to_duplicate} - Copiar"
        if base_name not in df_copy.columns:
            new_column_name = base_name
        else:
            i = 1
            while True:
                new_column_name = f"{base_name} ({i})"
                if new_column_name not in df_copy.columns:
                    break
                i += 1    
    df_copy[new_column_name] = df_copy[column_to_duplicate]
    
    return df_copy

OPERATIONS_MAP = {
    'add_new_column': add_new_column,
    'change_column_type': change_column_type,
    'replace_values': replace_values,
    'drop_null_rows': drop_null_rows,
    'drop_column': drop_column,
    'remove_rows_by_value': remove_rows_by_value,
    'change_case': change_case,
    'trim_spaces': trim_spaces,
    'rename_column': rename_column,
    'add_prefix': add_prefix,
    'add_suffix': add_suffix,
    'drop_duplicates': drop_duplicates,
    'conditional_column': conditional_column,
    'extract_from_date': extract_from_date,
    'split_by_delimiter': split_by_delimiter,
    'merge_columns': merge_columns,
    'duplicate_column': duplicate_column,
    'group_by': group_by,
    'filter_rows_by_value': filter_rows_by_value,
    'split_date_time': split_date_time,
    'sort_column': sort_column,
    'reorder_columns': reorder_columns,
}

def apply_transformations(df, steps):
    
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