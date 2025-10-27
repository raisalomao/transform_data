from django.shortcuts import render, redirect
import pandas as pd
import io
import json
from django.http import HttpResponse, JsonResponse

from .transformations import apply_transformations, format_date_columns

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
        request.session['nome_arquivo_original'] = nome_arquivo
        
        df = pd.DataFrame()
        file_extension = nome_arquivo.split('.')[-1].lower()

        try:
            if file_extension == 'csv':
                arquivo.seek(0)
                file_bytes = arquivo.read()
                df = None
                
                tentativas = [('utf-8', ';'), ('utf-8', ','), ('latin-1', ';'), ('latin-1', ',')]
                last_error = None

                for encoding, sep in tentativas:
                    try:
                        file_content = file_bytes.decode(encoding)
                        df = pd.read_csv(io.StringIO(file_content), sep=sep)
                        if df is not None and not df.empty:
                            break
                    except (UnicodeDecodeError, pd.errors.ParserError) as e:
                        last_error = e
                        df = None
                
                if df is None:
                    if last_error:
                        raise last_error
                    else:
                        raise Exception("Não foi possível ler o arquivo CSV.")

            elif file_extension == 'xlsx':
                df = pd.read_excel(arquivo)
            elif file_extension == 'json':
                df = pd.read_json(arquivo)
            else:
                context['erro'] = 'Formato de arquivo não suportado. Use CSV, XLSX ou JSON.'
                return render(request, 'extract_page.html', context)

            df = format_date_columns(df)
            df = df.fillna("")
            request.session['dataframe_json'] = df.to_json(orient='split')
            context['preview_html'] = df.head(10).to_html(classes='table table-sm table-bordered table-striped text-center', index=False)
            context['nome_arquivo'] = nome_arquivo

        except Exception as e:
            if 'Error tokenizing data' in str(e) or 'expected after' in str(e) and nome_arquivo.endswith('.csv'):
                context['erro'] = f"Aquivo '{nome_arquivo}'. Parece estar mal formatado ou usar um separador/codificação não suportado."
            else:
                context['erro'] = f"Arquivo '{nome_arquivo}'. Ocorreu um erro: {e}"
            
            return render(request, 'extract_page.html', context)

    return render(request, 'extract_page.html', context)

def transform_data(request):
    """
    Prepara a página de transformação interativa, enviando os dados iniciais.
    """
    
    dataframe_json = request.session.get('dataframe_json')
    if not dataframe_json:
        return redirect('extracting_page')

    try:
        df_original = pd.read_json(io.StringIO(dataframe_json), orient='split')
    except Exception as e:  
        return redirect('extracting_page') 

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        try:
            row_limit = int(request.GET.get('row_limit', 100))
            df_limited = df_original.head(row_limit) if row_limit != -1 else df_original
            return JsonResponse({
                'success': True,
                'headers': list(df_limited.columns),
                'rows': df_limited.replace({pd.NA: None}).to_dict(orient='records')
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    request.session['dataframe_original_etl'] = df_original.to_json(orient='split')
    request.session.pop('dataframe_json_transformado', None)

    df_para_render = df_original.head(100) 

    dtypes = df_para_render.dtypes.to_dict()
    headers_with_types = [{'name': col, 'type': str(dtypes[col])} for col in df_para_render.columns]
    nome_arquivo = request.session.get('nome_arquivo_original', 'arquivo.csv')

    context = {
        'titulo': 'Transformando e tratando seus dados',
        'colunas_json': json.dumps(headers_with_types),
        'linhas_json': df_para_render.to_json(orient='records'),
        'total_row_count': len(df_original),
        'original_filename_json': json.dumps(nome_arquivo)
    }
    
    return render(request, 'transform_page.html', context)

def apply_transform(request):
    """
    Recebe a lista de passos (receita) e aplica no DataFrame original.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'MÃ©todo invÃ¡lido'}, status=405)

    try:
        df_json = request.session.get('dataframe_original_etl')
        if not df_json:
            return JsonResponse({'success': False, 'error': 'SessÃ£o expirada ou dados nÃ£o encontrados.'}, status=400)

        df_original = pd.read_json(io.StringIO(df_json), orient='split')
        body = json.loads(request.body.decode('utf-8'))
        steps = body.get('steps', [])

        df_transformado = apply_transformations(df_original, steps)
        df_transformado = df_transformado.fillna("")
        request.session['dataframe_json_transformado'] = df_transformado.to_json(orient='split')
        dtypes = df_transformado.dtypes.to_dict()
        headers_with_types = [{'name': col, 'type': str(dtypes[col])} for col in df_transformado.columns]

        return JsonResponse({
            'success': True,
            'headers': headers_with_types,
            'rows': df_transformado.to_dict(orient='records')
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def load_data(request):
    """
    Carregamento/Exportação dos dados finais a partir da sessão,
    com prévia de 10 linhas e estilo completo.
    """
    dataframe_json = request.session.get('dataframe_json_transformado') or request.session.get('dataframe_original_etl')
    if not dataframe_json:
        return redirect('extracting_page')

    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    df_preview = df_final.head(10)

    nome_arquivo_original = request.session.get('nome_arquivo_original', 'dados_transformados.csv')
    nome_base = nome_arquivo_original.rsplit('.', 1)[0]

    context = {
        'titulo': 'Exportando suas transformações',
        'tabela_final_html': df_preview.to_html(classes='table table-primary text-center', index=False),
        'nome_arquivo_base': nome_base
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
    df_final.to_csv(response, index=False, sep=';', decimal=',')
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
    response.write(df_final.replace({pd.NA: None}).to_json(orient='records', indent=4))
    return response

def download_excel(request):
    """
    Fornece o download do arquivo final em formato XLSX (Excel).
    Garante que colunas com timestamps numéricos sejam convertidas para datas.
    """
    dataframe_json = request.session.get('dataframe_json_transformado')
    if not dataframe_json:
        return redirect('extracting_page')

    df_final = pd.read_json(io.StringIO(dataframe_json), orient='split')
    
    
    for col in df_final.columns:
        if pd.api.types.is_numeric_dtype(df_final[col]) and df_final[col].max() > 1000000000:
            try:
                df_final[col] = pd.to_datetime(df_final[col], unit='ms', errors='coerce')
            except Exception as e:
                print(f"Aviso: NÃ£o foi possÃvel converter a coluna '{col}' para data no download: {e}")
                pass
    

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_final.to_excel(writer, index=False, sheet_name='Dados')
    output.seek(0)

    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    return response