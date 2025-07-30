# app/views.py
from django.shortcuts import render, redirect
import pandas as pd
import io

def home(request):
    """
    Tela de boas-vindas para a aplicação
    """
    if 'dataframe_json' in request.session:
        del request.session['dataframe_json']

    context = {
        'titulo': 'Tratamento de dados',
    }
    return render(request, 'home_page.html', context)

def extract_data(request):
    """
    Extração de dados via upload de arquivo (CSV, XLSX, JSON).
    Mostra um preview em um modal.
    """
    context = {'titulo': 'Passo 1: Extração de Dados'}

    if request.method == 'POST' and request.FILES.get('arquivo_dados'):
        arquivo = request.FILES['arquivo_dados']
        nome_arquivo = arquivo.name
        separador_csv = request.POST.get('separador', ',') 
        
        df = None
        try:
            # Identifica a extensão do arquivo e usa a função de leitura apropriada
            if nome_arquivo.endswith('.csv'):
                df = pd.read_csv(arquivo, sep=separador_csv)
            elif nome_arquivo.endswith('.xlsx'):
                df = pd.read_excel(arquivo)
            elif nome_arquivo.endswith('.json'):
                df = pd.read_json(arquivo)
            else:
                context['erro'] = 'Formato de arquivo não suportado. Use CSV, XLSX ou JSON.'
                return render(request, 'application/extract_page.html', context)

            # Armazena o DataFrame na sessão (convertido para JSON)
            request.session['dataframe_json'] = df.to_json(orient='split')

            # Gera o preview para o modal (10 primeiras linhas)
            preview_df = df.head(10)
            context['preview_html'] = preview_df.to_html(classes='table table-sm table-bordered table-striped', index=False)
            context['nome_arquivo'] = nome_arquivo

        except Exception as e:
            # Adiciona uma mensagem de erro mais específica para CSV
            if 'Error tokenizing data' in str(e) and nome_arquivo.endswith('.csv'):
                 context['erro'] = f"Ocorreu um erro ao processar o CSV. Verifique se o separador ('{separador_csv}') está correto para este arquivo."
            else:
                context['erro'] = f"Ocorreu um erro ao processar o arquivo: {e}"


    return render(request, 'extract_page.html', context)

def transform_data(request):
    """
    Transformação e limpeza dos dados carregados da sessão.
    """
    # Puxa o DataFrame da sessão
    dataframe_json = request.session.get('dataframe_json')
    if not dataframe_json:
        # Se não houver dados na sessão, redireciona para a página de extração
        return redirect('extracting_page')

    df = pd.read_json(io.StringIO(dataframe_json), orient='split')
    df_transformado = df.copy() # Cria uma cópia para preservar o original
    # Aqui precisamos realizar todo processo de transformação de dados (provavelmente precisaremos de uma pasta para todos esses métodos)
    
    # Salva o DataFrame transformado de volta na sessão para a próxima etapa
    request.session['dataframe_json_transformado'] = df_transformado.to_json(orient='split')

    context = {
        'titulo': 'Passo 2: Transformação e Limpeza',
        'tabela_original_html': df.to_html(classes='table table-danger', index=False),
        'tabela_transformada_html': df_transformado.to_html(classes='table table-success', index=False)
    }
    return render(request, 'transform_page.html', context)


def load_data(request):
    """
    Carregamento/Exportação dos dados finais a partir da sessão.
    """
    # dataframe que já foi processado pela etapa de transformação
    dataframe_json = request.session.get('dataframe_json_transformado')
    if not dataframe_json:
        # Se não houver dados, redireciona para o início do fluxo
        return redirect('extracting_page')

    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    # Podemos "salvar" em diferentes formatos além do que foi selecionado pelo usuário
    csv_final = df_final.to_csv(index=False)
    json_final = df_final.to_json(orient='records', indent=4)

    context = {
        'titulo': 'Passo 3: Carregamento e Exportação',
        'tabela_final_html': df_final.to_html(classes='table table-primary', index=False)
        # 'csv_data': csv_final,
        # 'json_data': json_final
    }
    return render(request, 'load_page.html', context)