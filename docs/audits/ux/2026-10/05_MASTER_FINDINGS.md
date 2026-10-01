# Consolidação preliminar

Não resolve. Não ordena. Não propõe desenho.

Os números contam findings, não ecrãs. Um finding com duas marcas entra na marca principal. «Coberto por teste» é marca extra e não entra na soma.

## 1. Total de findings

| Papel | Quantidade | IDs |
|---|---|---|
| Passageiro | 30 | UX-PAX-001–030 |
| Motorista | 17 | UX-DRV-001–017 |
| Parceiro | 14 | UX-PTN-001–014 |
| Admin | 16 | UX-ADM-001–016 |
| Total | 77 | |

## 2. Findings transversais

Nove padrões. Cada um junta findings de mais do que um papel.

### Navegação

Caminhos diferentes para a mesma Conta. Barra e menu com as mesmas entradas. Admin com grupos e tabs. «Voltar» do parceiro sai da lista. Registo de atividade abre definições.

UX-PAX-025, UX-DRV-001, UX-DRV-010, UX-DRV-015, UX-PTN-012, UX-PTN-013, UX-ADM-002, UX-ADM-015.

### Formulários

Placeholder no lugar do nome. Caixa de confirmar palavra-passe que não parece campo. Palavra-passe e telemóvel já escritos na entrada. Pedido de UUID. Aprovar sem pergunta.

UX-PAX-004, UX-PAX-005, UX-PAX-010, UX-PAX-022, UX-PTN-007, UX-DRV-012, UX-PTN-003, UX-ADM-007, UX-ADM-010.

### Linguagem

Beta, v1, build, API, JWT, payout, Stripe, OSRM, cron, KYC, estados ingleses, «frota Default», «separador Frota».

UX-PAX-001, UX-PAX-006, UX-PAX-007, UX-PAX-008, UX-DRV-006, UX-DRV-007, UX-DRV-012, UX-DRV-013, UX-PTN-002, UX-PTN-003, UX-PTN-011, UX-ADM-003, UX-ADM-004, UX-ADM-005, UX-ADM-009, UX-ADM-011, UX-ADM-012.

### Scroll e primeira vista

Métodos de entrada, acções da viagem, SOS, menus longos, documentos, passos 2 e 3 da frota admin, playbooks fechados.

UX-PAX-015, UX-PAX-023, UX-PAX-028, UX-DRV-009, UX-PTN-013, UX-ADM-016.

### Erros

Frase sem passo seguinte. Dois textos de repouso. Cancelar sem efeito. Silenciar sem destino. Cron em JSON. Sem recuperar palavra-passe.

UX-PAX-008, UX-PAX-021, UX-PAX-030, UX-DRV-002, UX-DRV-004, UX-DRV-005, UX-DRV-008, UX-DRV-017, UX-ADM-008, UX-ADM-012.

### Dados técnicos

Identificadores, oito caracteres, coordenadas, `doc_key`, papel cru, código de versão, «Conta · ».

UX-PAX-007, UX-PAX-012, UX-PAX-016, UX-DRV-011, UX-PTN-004, UX-PTN-005, UX-ADM-005, UX-ADM-006, UX-ADM-013.

### Duplicações

Conta / Perfil / Conta (detalhe). Documentos em três papéis. Aprovar em Pendentes e em Dados. Frota do parceiro e do admin. Definições no header e no menu.

UX-DRV-010, UX-PTN-013, UX-ADM-009, UX-ADM-015, UX-PAX-025.

### Acessibilidade

Cor ou ponto sem palavra. Alvo pequeno. Placeholder como label. JSON como resultado.

UX-PAX-017, UX-DRV-005, UX-ADM-016, UX-PAX-010.

### Ecrã largo, estreito, outro aparelho

Entrada vista no browser largo. Mapas, folhas, Google nativo, ficheiros e Waze/Maps não vistos num telemóvel.

UX-DRV-008, UX-PAX-006, UX-ADM-002.

São 9 blocos nesta secção. O pedido pedia agrupamento por essas categorias; ficam 9, não 12. A contagem usada no relatório é 9.

## 3. Duplicados e findings relacionados

| Grupo | IDs | O que repetem |
|---|---|---|
| Entrada de laboratório | UX-PAX-001, UX-PAX-002, UX-PAX-003, UX-PAX-004, UX-PAX-005, UX-PAX-007, UX-PTN-001, UX-ADM-001 | O mesmo cartão nos quatro papéis |
| Google só num papel | UX-PAX-006, UX-PAX-009 | Botão e ecrã seguinte |
| Confirmar palavra-passe | UX-PAX-022, UX-PTN-013, UX-ADM-015 | A mesma caixa |
| Métodos abaixo da dobra | UX-PAX-023, UX-DRV-010, UX-PTN-013, UX-ADM-015 | A mesma Conta, caminhos diferentes |
| Identificador de viagem | UX-PAX-012, UX-PAX-016, UX-PTN-004, UX-PTN-005, UX-ADM-005, UX-ADM-013 | Código no lugar de um nome |
| Dinheiro | UX-DRV-006, UX-DRV-007, UX-DRV-014, UX-PTN-002, UX-ADM-004, UX-ADM-014 | Preço, parte, payout, receita, hoje |
| Documentos sem passo | UX-DRV-002, UX-DRV-003, UX-DRV-016, UX-PTN-008, UX-PTN-009, UX-ADM-009 | Três sítios, nenhuma frase única de «o que fazer» |
| Frota e UUID | UX-PTN-003, UX-PTN-010, UX-ADM-010 | Default, plataforma, partner_id |
| Viagem baixa e SOS | UX-PAX-015, UX-PAX-028, UX-DRV-009 | Faixa e três letras |
| Cancelar sem efeito | UX-PAX-021, UX-DRV-017 | Motivo e confirmar, sem custo |
| Stripe | UX-PTN-002, UX-ADM-005, UX-ADM-011 | A palavra no parceiro e no admin |
| Saúde por cor | UX-PAX-017, UX-ADM-016 | Ponto sem palavra |
| Definições escondidas ou noutro nome | UX-PAX-025, UX-PAX-026, UX-DRV-015, UX-ADM-015 | Menu, header, registo de atividade |
| Reclamação | UX-PAX-018, UX-ADM-006 | O passageiro não acha a lista; o admin vê o estado cru |

São 14 grupos.

## 4. Confirmado e inferido

Marca principal de cada finding:

| Estado | Quantidade |
|---|---|
| OBSERVADO | 10 |
| OBSERVADO ANTES | 3 |
| INFERIDO | 64 |
| COBERTO POR TESTE | 0 como marca única; 7 findings inferidos trazem esta marca a mais |
| NÃO OBSERVADO | 0 findings; os shells interiores não foram abertos |

Os 10 observados são a entrada: UX-PAX-001 a 007, UX-PAX-030, UX-PTN-001, UX-ADM-001.

Os 3 observados antes são a Conta do passageiro: UX-PAX-022, UX-PAX-023, UX-PAX-024.

Os 7 com teste além da inferência: UX-PAX-009, UX-PAX-015, UX-DRV-005, UX-PTN-004, UX-ADM-004, UX-ADM-005, UX-ADM-009.

## 5. Superfícies ainda não vistas por uma pessoa

56. A entrada dos quatro papéis foi vista. A Conta foi vista no passageiro, numa passagem anterior.

Passageiro (12): home, pedido, espera, viagem activa, histórico em lista, histórico em detalhe, pagamento, cancelamento, SOS, menu, definições, continuar com Google.

Motorista (17): home, disponibilidade, ofertas, viagem activa, cancelamento, SOS, rendimentos, caixa, menu, perfil, conta neste caminho, documentos, zonas, navegação, categorias, preços, definições.

Parceiro (14): home, hub, lista, mapa, adicionar motorista, ficha, viaturas, documentos, viagens, relatórios, caixa, perfil, definições, alertas no ecrã.

Admin (13): Agora, Viagens, Reclamações, Pendentes, Utilizadores, Documentos, Frota, Saúde, Operações, Métricas, Dados, Conta do header, Definições do header.

## 6. Padrões que se repetem

- Linguagem de sistema no sítio da pessoa: beta, API, JWT, UUID, payout, Stripe, cron, KYC, estados ingleses.
- Um código no lugar de um nome ou de um sítio.
- O nome do campo desaparece, ou o campo não parece campo.
- A acção seguinte está abaixo da primeira vista, sem pista.
- Duas entradas para a mesma função, com nomes diferentes.
- Um estado que não diz o que fazer a seguir.
- Dinheiro com mais do que um significado no mesmo ecrã.
- Confirmação em falta num toque que decide, ou confirmação escrita para quem mexe na base.

## 7. Questões para uma validação visual futura

Sem ordem.

- No telemóvel, a tab Saúde mostra o ponto vermelho sem a frase?
- A faixa da viagem deixa Cheguei, Iniciar, Terminar e SOS fora do primeiro olhar?
- Silenciar e Recusar, lado a lado, leem-se como acções diferentes?
- A Conta no motorista, no parceiro e no admin mostra os métodos só depois de scroll, como no passageiro?
- «Conta», «Perfil» e «Conta (detalhe)» são percebidos como a mesma coisa por quem tem mais do que um papel?
- O bloqueio de viatura e o de documentos dizem um passo que a pessoa encontra?
- Os dois textos de repouso aparecem os dois, ou só um?
- A oferta mostra estimativa e parte do motorista ao mesmo tempo?
- A receita do parceiro e os números de Agora são lidos como dinheiro a receber?
- No admin, em cinco segundos, a pessoa aponta para Reclamações sem ajuda?
- Aprovar um pendente pede mesmo só um toque?
- O resultado de «Correr cron agora» é uma frase ou a linha `status=`?
- A lista de documentos do admin mostra `doc_key` e Pending a quem não lê código?
- O histórico fora de Oeiras e do centro mostra coordenadas?
- O Google no passageiro, no aparelho, abre escolha de conta ou cria conta sem o ecrã intermédio?
- A palavra-passe da entrada vem preenchida num browser limpo, ou só neste?
- O botão do papel na entrada acompanha o endereço: em `/admin` o preenchido é Administrador?
