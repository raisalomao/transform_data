from django.shortcuts import render, redirect
import pandas as pd
import io
import json
from django.http import HttpResponse, JsonResponse

from .transformations import apply_transformations

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
    context = {'titulo': 'Extraindo seus dados'}

    if request.method == 'POST' and request.FILES.get('arquivo_dados'):
        arquivo = request.FILES['arquivo_dados']
        nome_arquivo = arquivo.name
        separador_csv = request.POST.get('separador', ',') 
        
        df = None
        try:
            if nome_arquivo.endswith('.csv'):
                df = pd.read_csv(arquivo, sep=separador_csv)
            elif nome_arquivo.endswith('.xlsx'):
                df = pd.read_excel(arquivo)
            elif nome_arquivo.endswith('.json'):
                df = pd.read_json(arquivo)
            else:
                context['erro'] = 'Formato de arquivo não suportado. Use CSV, XLSX ou JSON.'
                return render(request, 'extract_page.html', context)

            request.session['dataframe_json'] = df.to_json(orient='split')
            preview_df = df.head(10)
            context['preview_html'] = preview_df.to_html(classes='table table-sm table-bordered table-striped text-center', index=False)
            context['nome_arquivo'] = nome_arquivo

        except Exception as e:
            if 'Error tokenizing data' in str(e) and nome_arquivo.endswith('.csv'):
                 context['erro'] = f"Ocorreu um erro ao processar o CSV. Verifique se o separador ('{separador_csv}') está correto para este arquivo."
            else:
                context['erro'] = f"Ocorreu um erro ao processar o arquivo: {e}"
    return render(request, 'extract_page.html', context)

def transform_data(request):
    """
    Prepara a página de transformação interativa, enviando os dados iniciais.
    Também pode retornar apenas os dados em JSON se houver row_limit na query.
    """
    dataframe_json = request.session.get('dataframe_json')
    if not dataframe_json:
        return redirect('extracting_page')

    df_original = pd.read_json(io.StringIO(dataframe_json), orient='split')
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        row_limit = int(request.GET.get('row_limit', 100))
        if row_limit != -1:
            df_limited = df_original.head(row_limit)
        else:
            df_limited = df_original
        return JsonResponse({
            'success': True,
            'headers': list(df_limited.columns),
            'rows': df_limited.to_dict(orient='records')
        })

    request.session['dataframe_original_etl'] = df_original.to_json(orient='split')
    if 'dataframe_json_transformado' in request.session:
        del request.session['dataframe_json_transformado']

    context = {
        'titulo': 'Transformando e tratando seus dados',
        'tabela_html': df_original.head(100).to_html(classes='table table-sm table-striped table-bordered text-center', index=False),
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
        steps = body.get('steps', [])
        df_transformado = apply_transformations(df_original, steps)
        request.session['dataframe_json_transformado'] = df_transformado.to_json(orient='split')
        headers = list(df_transformado.columns)
        rows = df_transformado.to_dict(orient='records')
        return JsonResponse({'success': True, 'headers': headers, 'rows': rows})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def load_data(request):
    """
    Carregamento/Exportação dos dados finais a partir da sessão,
    com prévia de 10 linhas e estilo completo.
    """
    dataframe_json = request.session.get('dataframe_json_transformado')
    
    if not dataframe_json:
        dataframe_json = request.session.get('dataframe_original_etl')
        if not dataframe_json:
             return redirect('extracting_page')

    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    df_preview = df_final.head(10)

    context = {
        'titulo': 'Carregando e exportando seus dados',
        'tabela_final_html': df_preview.to_html(classes='table table-primary text-center', index=False),

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
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="dados_transformados.csv"'
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
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_final.to_excel(writer, index=False, sheet_name='Dados')
    output.seek(0)
    
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="dados_transformados.xlsx"'
    return response