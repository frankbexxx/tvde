# Veiculos Uber (Lisboa) — referencia estruturada

Dados convertidos a partir de `C:/dev/_misc/carros_tvde_uber_Lisboa.txt` (marcas, modelos, ano e categorias de produto Uber).

## Ficheiros maquina-legiveis

| Ficheiro | Formato |
|----------|---------|
| [uber_lisboa_veiculos_tvde.json](./uber_lisboa_veiculos_tvde.json) | JSON (`meta` + `vehicles[]`) |
| [uber_lisboa_veiculos_tvde.csv](./uber_lisboa_veiculos_tvde.csv) | CSV (`make,model,year,categories`) |

## Resumo

- **Veiculos (linhas de modelo):** 894
- **Marcas distintas:** 108
- **Anos no dataset:** 2018, 2019

## Categorias (frequencia)

| Categoria | Modelos |
|-----------|--------:|
| Courier | 738 |
| Priority | 738 |
| Store Pickup | 738 |
| UberX | 738 |
| Women Drivers | 738 |
| Comfort | 347 |
| Electric | 335 |
| UberXL | 89 |
| Black | 45 |
| UberXXL | 29 |
| UberEATS Marketplace | 1 |

## Top 15 marcas por numero de modelos

| Marca | Modelos |
|-------|--------:|
| BMW | 56 |
| Mercedes-Benz | 51 |
| Volkswagen | 48 |
| Audi | 46 |
| Toyota | 46 |
| Citroën | 42 |
| Renault | 38 |
| Hyundai | 36 |
| Kia | 33 |
| Peugeot | 32 |
| Ford | 31 |
| Opel | 24 |
| BYD | 21 |
| Honda | 21 |
| Volvo | 18 |

## Nota

Referencia de mercado / paridade (lista Uber), nao substitui requisitos legais de TVDE.

## Regenerar

Na raiz do repo:

```bash
python scripts/convert_uber_lisboa_veiculos.py
```
