# Visualizador simples a partir de planilha

Este repositório contém um visualizador HTML simples que carrega `data.json` (array de objetos) e apresenta uma lista de registros e detalhes, incluindo imagens se houver URLs.

Passos para usar com a sua planilha Excel:

1. Coloque sua planilha `.xlsx` na raiz do projeto.
2. Instale dependências para conversão (Python 3):

```powershell
pip install pandas openpyxl
```

3. Converta para `data.json` usando Python ou Node.js.

Python:
```powershell
python convert_xlsx_to_json.py "Cópia de ovario_base_com_dicionario.xlsx" data.json
```

Node.js:
```powershell
npm install
node convert_xlsx_to_json.js "Cópia de ovario_base_com_dicionario.xlsx" data.json 7
```

4. Sirva os arquivos estáticos (recomendado usar um servidor local). Exemplo com Python 3:

```powershell
python -m http.server 8000
# e depois abra http://localhost:8000
```

5. Na página, use o campo de pesquisa para filtrar e clique em um item para ver detalhes. Se sua planilha tiver uma coluna com URLs de imagem (nome contendo `url`, `image`, `img` ou `path`), o visualizador tentará mostrar a imagem.

Personalizações que posso fazer:
- Mapear campos específicos da planilha para labels visuais
- Mostrar miniaturas responsivas
- Integração com visualizadores de imagens grandes (OpenSeadragon)
