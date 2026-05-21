"""
Converte um arquivo Excel (.xlsx) em data.json (array de objetos).
Uso:
  pip install pandas openpyxl
  python convert_xlsx_to_json.py input.xlsx [output.json]

O script tentará normalizar cabeçalhos (remover espaços) e detectar colunas de imagem.
"""
import sys
import json
import pandas as pd

def normalize_columns(cols):
    return [c.strip().replace(' ','_') for c in cols]

def main():
    if len(sys.argv)<2:
        print('Usage: python convert_xlsx_to_json.py input.xlsx [output.json]')
        return
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv)>2 else 'data.json'
    df = pd.read_excel(inp, sheet_name=0, dtype=object)
    df.columns = normalize_columns(df.columns.astype(str))
    records = df.fillna('').to_dict(orient='records')
    # Optionally detect image columns and keep them as-is
    with open(out,'w',encoding='utf-8') as f:
        json.dump(records,f,ensure_ascii=False,indent=2)
    print(f'Escreveu {len(records)} registros em {out}')

if __name__=='__main__':
    main()
