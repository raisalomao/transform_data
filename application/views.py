# app/views.py
from django.shortcuts import render, redirect
import pandas as pd
import io
import json
from django.http import HttpResponse, JsonResponse
from .transformations import apply_transformations  # Importa as funções de transformação

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
    """ Prepara a página de transformação interativa, enviando os dados iniciais. """
    dataframe_json = request.session.get('dataframe_json')
    if not dataframe_json:
        return redirect('extracting_page')
    df_original = pd.read_json(io.StringIO(dataframe_json), orient='split')
    request.session['dataframe_original_etl'] = df_original.to_json(orient='split')
    if 'dataframe_json_transformado' in request.session:
        del request.session['dataframe_json_transformado']
    context = {
        'titulo': 'Passo 2: Transformação Interativa',
        'tabela_html': df_original.to_html(classes='table table-sm table-striped table-bordered', index=False),
        'colunas_json': json.dumps(list(df_original.columns))
    }
    return render(request, 'transform_page.html', context)

def apply_transform(request):
    """
    Recebe a lista de passos (receita) e aplica no DataFrame original.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método inválido'}, status=405)

    try:
        df_json = request.session.get('dataframe_original_etl')
        if not df_json:
            return JsonResponse({'success': False, 'error': 'Sessão expirada ou dados não encontrados.'}, status=400)
        df_original = pd.read_json(io.StringIO(df_json), orient='split')

        body = json.loads(request.body)
        steps = body.get('steps', []) # Alterado de 'passos' para 'steps'

        # Agora passamos a variável correta para a função
        df_transformado = apply_transformations(df_original, steps)
        request.session['dataframe_json_transformado'] = df_transformado.to_json(orient='split')

        headers = list(df_transformado.columns)
        rows = df_transformado.to_dict(orient='records')
        
        return JsonResponse({'success': True, 'headers': headers, 'rows': rows})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

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

def download_csv(request):
    """
    Fornece o download do arquivo final em formato CSV.
    """
    dataframe_json = request.session.get('dataframe_json_transformado')
    if not dataframe_json:
        return redirect('extracting_page')
    
    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    
    # Cria uma resposta HTTP com o tipo de conteúdo para CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    # O cabeçalho 'Content-Disposition' força o download no navegador
    response['Content-Disposition'] = 'attachment; filename="dados_transformados.csv"'
    
    # Escreve o DataFrame como CSV na resposta. sep=';' é bom para Excel em português.
    df_final.to_csv(path_or_buf=response, index=False, sep=';', decimal=',')
    return response

def download_json_file(request):
    """
    Fornece o download do arquivo final em formato JSON.
    """
    dataframe_json = request.session.get('dataframe_json_transformado')
    if not dataframe_json:
        return redirect('extracting_page')
    
    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    
    response = HttpResponse(content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="dados_transformados.json"'
    
    # Escreve o DataFrame como JSON na resposta
    response.write(df_final.to_json(orient='records', indent=4))
    return response

def download_excel(request):
    """
    Fornece o download do arquivo final em formato XLSX (Excel).
    """
    dataframe_json = request.session.get('dataframe_json_transformado')
    if not dataframe_json:
        return redirect('extracting_page')
    
    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    
    # Usa um buffer na memória para criar o arquivo Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_final.to_excel(writer, index=False, sheet_name='Dados')
    
    output.seek(0) # Volta para o início do buffer
    
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="dados_transformados.xlsx"'
    return response