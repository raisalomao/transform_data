# app/views.py
from django.shortcuts import render
import pandas as pd
import io

def home(request):
    """
    Tela de boas-vindas para a aplicação
    """
    context = {
        'titulo': 'Tratamento de dados',
    }
    return render(request, 'home_page.html', context)

def extract_data(request):
    """
    Extração de dados.
    """
    dados_simulados = {
        'ID do Produto': [101, 102, 103, 104, 105],
        'Nome do Produto': ['Laptop', 'Mouse', 'Teclado', 'Monitor', 'Webcam'],
        'Preço': [4500.00, 150.50, 200.00, 1200.75, 300.00],
        'Estoque': [15, 120, 75, 30, 50]
    }
    df = pd.DataFrame(dados_simulados)
    tabela_html = df.to_html(classes='table table-striped table-bordered', index=False)

    context = {
        'titulo': 'Passo 1: Extração de Dados',
        'tabela_html': tabela_html
    }
    return render(request, 'extract_page.html', context)

def transform_data(request):
    """
    Transformação e limpeza dos dados.
    """
    dados_simulados = {
        'ID do Produto': [101, 102, 103, 104, 105, 106],
        'Nome do Produto': ['Laptop', 'Mouse', None, 'Monitor', 'Webcam', 'Microfone'],
        'Preço': [4500.00, 150.50, 200.00, None, 300.00, 250.00],
        'Estoque': [15, 120, 75, 30, 50, -5] # Estoque negativo para tratar
    }
    df = pd.DataFrame(dados_simulados)

    # 1. Remover linhas com dados nulos nas colunas 'Nome do Produto' ou 'Preço'
    df_transformado = df.dropna(subset=['Nome do Produto', 'Preço']).copy()
    # 2. Corrigir valores inconsistentes (estoque negativo vira 0)
    df_transformado['Estoque'] = df_transformado['Estoque'].apply(lambda x: x if x > 0 else 0)
    # 3. Criar uma nova coluna (ex: Valor Total em Estoque)
    df_transformado['Valor_Total_Estoque'] = df_transformado['Preço'] * df_transformado['Estoque']
    # Arredondar para 2 casas decimais
    df_transformado['Valor_Total_Estoque'] = df_transformado['Valor_Total_Estoque'].round(2)

    context = {
        'titulo': 'Passo 2: Transformação e Limpeza',
        'tabela_original_html': df.to_html(classes='table table-danger', index=False),
        'tabela_transformada_html': df_transformado.to_html(classes='table table-success', index=False)
    }
    return render(request, 'transform_page.html', context)

def load_data(request):
    """
    Carregamento/Exportação dos dados finais.
    """
    dados_finais_simulados = {
        'ID do Produto': [101, 102, 105],
        'Nome do Produto': ['Laptop', 'Mouse', 'Webcam'],
        'Preço': [4500.00, 150.50, 300.00],
        'Estoque': [15, 120, 50],
        'Valor_Total_Estoque': [67500.00, 18060.00, 15000.00]
    }
    df_final = pd.DataFrame(dados_finais_simulados)

    # Exemplo de como "salvar" em diferentes formatos (simulação)
    csv_final = df_final.to_csv(index=False)
    json_final = df_final.to_json(orient='records', indent=4)

    context = {
        'titulo': 'Passo 3: Carregamento e Exportação',
        'tabela_final_html': df_final.to_html(classes='table table-primary', index=False),
        'csv_data': csv_final,
        'json_data': json_final
    }
    return render(request, 'load_page.html', context)