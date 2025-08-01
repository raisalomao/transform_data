import pandas as pd
import numpy as np

def adicionar_nova_coluna(df, nome_coluna, valor_padrao=""):
    """Adiciona uma nova coluna com um valor padrão."""
    df_copia = df.copy()
    df_copia[nome_coluna] = valor_padrao
    return df_copia

def mudar_tipo_coluna(df, nome_coluna, novo_tipo):
    """
    Muda o tipo de uma coluna.
    Exemplos de novo_tipo: 'int64', 'float64', 'str', 'datetime64[ns]'
    """
    df_copia = df.copy()
    if nome_coluna not in df_copia.columns:
        return df_copia

    if novo_tipo == 'datetime':
        df_copia[nome_coluna] = pd.to_datetime(df_copia[nome_coluna], errors='coerce')
    else:
        try:
            # Usar 'ignore' pode não ser o ideal, pois não levanta erro.
            # Uma abordagem melhor é tentar e, se falhar, não fazer nada.
            if novo_tipo in ['int64', 'float64']:
                 df_copia[nome_coluna] = pd.to_numeric(df_copia[nome_coluna], errors='coerce')
            df_copia[nome_coluna] = df_copia[nome_coluna].astype(novo_tipo)
        except Exception:
            pass # Ignora se a conversão falhar
    return df_copia

def substituir_valores(df, nome_coluna, para_substituir, novo_valor):
    """Substitui um valor específico em uma coluna."""
    df_copia = df.copy()
    if nome_coluna in df_copia.columns:
        df_copia[nome_coluna] = df_copia[nome_coluna].replace(para_substituir, novo_valor)
    return df_copia

def apagar_linhas_nulas(df, subset_colunas=None):
    """Remove linhas com valores nulos (NaN) ou em branco."""
    df_copia = df.copy()
    # Garante que subset_colunas seja uma lista de colunas existentes
    if subset_colunas:
        subset_colunas = [col for col in subset_colunas if col in df_copia.columns]
    return df_copia.dropna(subset=subset_colunas if subset_colunas else None)

def remover_coluna(df, nome_coluna):
    """Remove uma ou mais colunas."""
    df_copia = df.copy()
    if not isinstance(nome_coluna, list):
        nome_coluna = [nome_coluna]
    return df_copia.drop(columns=nome_coluna, errors='ignore')

def remover_linhas_especificas(df, nome_coluna, valor):
    """Remove linhas com base em um valor específico em uma coluna."""
    df_copia = df.copy()
    if nome_coluna in df_copia.columns:
        # Garante que a comparação de tipos seja justa
        try:
            if pd.api.types.is_numeric_dtype(df_copia[nome_coluna]):
                valor = type(df_copia[nome_coluna].iloc[0])(valor)
        except (ValueError, IndexError):
            pass # Mantém o valor como string se a conversão falhar
        return df_copia[df_copia[nome_coluna] != valor]
    return df_copia
    
def mudar_case(df, nome_coluna, case='upper'):
    """Altera o case de uma coluna de texto: 'upper', 'lower', 'title'."""
    df_copia = df.copy()
    if nome_coluna in df_copia.columns:
        if case == 'upper':
            df_copia[nome_coluna] = df_copia[nome_coluna].astype(str).str.upper()
        elif case == 'lower':
            df_copia[nome_coluna] = df_copia[nome_coluna].astype(str).str.lower()
        elif case == 'title':
            df_copia[nome_coluna] = df_copia[nome_coluna].astype(str).str.title()
    return df_copia

def remover_duplicados(df, subset_colunas=None):
    """Remove linhas duplicadas, considerando todas ou um subconjunto de colunas."""
    df_copia = df.copy()
    if subset_colunas:
        subset_colunas = [col for col in subset_colunas if col in df_copia.columns]
    return df_copia.drop_duplicates(subset=subset_colunas if subset_colunas else None)

def coluna_condicional(df, nova_coluna, coluna_base, condicoes, valor_padrao):
    """Cria uma coluna com base em condições em outra."""
    df_copia = df.copy()
    if coluna_base not in df_copia.columns:
        return df_copia

    df_copia[coluna_base] = pd.to_numeric(df_copia[coluna_base], errors='coerce')
    
    conditions_list = []
    values_list = []
    
    for item in condicoes:
        try:
            op_map = {'>': (lambda c, v: c > v), '<': (lambda c, v: c < v),
                      '>=': (lambda c, v: c >= v), '<=': (lambda c, v: c <= v),
                      '==': (lambda c, v: c == v), '!=': (lambda c, v: c != v)}
            
            parts = item['condicao'].split()
            op_str = parts[0]
            val = float(parts[1])
            
            conditions_list.append(op_map[op_str](df_copia[coluna_base], val))
            values_list.append(item['valor'])
        except Exception:
            continue

    df_copia[nova_coluna] = np.select(conditions_list, values_list, default=valor_padrao)
    return df_copia

def extrair_de_data(df, nome_coluna):
    """Cria colunas de Ano, Mês e Dia a partir de uma coluna de data."""
    df_copia = df.copy()
    if nome_coluna in df_copia.columns:
        s_date = pd.to_datetime(df_copia[nome_coluna], errors='coerce')
        df_copia[f'Ano_{nome_coluna}'] = s_date.dt.year
        df_copia[f'Mes_{nome_coluna}'] = s_date.dt.month
        df_copia[f'Dia_{nome_coluna}'] = s_date.dt.day
    return df_copia

def separar_por_delimitador(df, nome_coluna, delimitador, novas_colunas):
    """Divide uma coluna em várias com base em um delimitador."""
    df_copia = df.copy()
    if nome_coluna in df_copia.columns:
        split_data = df_copia[nome_coluna].astype(str).str.split(delimitador, expand=True)
        for i, col_name in enumerate(novas_colunas):
            if i < split_data.shape[1]:
                df_copia[col_name] = split_data[i]
            else:
                df_copia[col_name] = None
    return df_copia

def group_by(df, colunas_agrupar, agregacoes):
    """
    Agrupa o DataFrame e aplica agregações.
    agregacoes: {'coluna_a_agregar': 'sum', 'outra_coluna': 'mean'}
    """
    df_copia = df.copy()
    return df_copia.groupby(colunas_agrupar).agg(agregacoes).reset_index()


# --- DICIONÁRIO E MOTOR PRINCIPAL ---
OPERATIONS_MAP = {
    'adicionar_nova_coluna': adicionar_nova_coluna,
    'mudar_tipo_coluna': mudar_tipo_coluna,
    'substituir_valores': substituir_valores,
    'apagar_linhas_nulas': apagar_linhas_nulas,
    'remover_coluna': remover_coluna,
    'remover_linhas_especificas': remover_linhas_especificas,
    'mudar_case': mudar_case,
    'remover_duplicados': remover_duplicados,
    'coluna_condicional': coluna_condicional,
    'extrair_de_data': extrair_de_data,
    'separar_por_delimitador': separar_por_delimitador,
    'group_by': group_by,
}

def aplicar_transformacoes(df, passos):
    """
    Aplica uma lista de passos de transformação a um DataFrame.
    """
    df_transformado = df.copy()
    for passo in passos:
        operacao = passo['operacao']
        params = passo.get('parametros', {})
        
        if operacao in OPERATIONS_MAP:
            funcao = OPERATIONS_MAP[operacao]
            try:
                df_transformado = funcao(df_transformado, **params)
            except Exception as e:
                print(f"Erro ao aplicar '{operacao}' com params {params}: {e}")
                continue 
        else:
            print(f"Atenção: Operação '{operacao}' não reconhecida.")
    return df_transformado