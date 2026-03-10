Documento de Visão do Sistema

TVDE Ride Platform – Product & Architecture Vision

(documento conceptual para alinhamento do projeto)

1. Visão do Produto

A aplicação é uma plataforma ride-sharing mobile-first, funcionalmente próxima de Uber/Bolt, mas com arquitetura simplificada e orientada para iteração rápida.

Objetivo principal:

ligar passageiros a motoristas TVDE
de forma rápida, clara e confiável

Princípios centrais:

ação rápida
informação clara
interface calma

A app deve transmitir:

confiança
segurança
fluidez

A experiência visual segue um estilo:

atmospheric mobility UI

com:

gradientes orgânicos
fundos atmosféricos
cards legíveis
2. Mercado Inicial

Primeiro mercado:

Portugal

Expansão natural prevista:

Espanha (Galiza)

Isso influencia:

UX
regulação
licenciamento TVDE

Arquitetura deve permitir expansão sem mudanças estruturais.

3. Arquitetura Geral

A aplicação é composta por três camadas principais:

Backend
Frontend
Design System
Backend

Stack principal:

FastAPI
PostgreSQL
SQLAlchemy
Stripe

Responsável por:

autenticação
gestão de viagens
matching motorista/passageiro
pagamentos
estado das viagens
Frontend

Stack:

React
TypeScript
Vite
Tailwind

Objetivo:

web app mobile-first

Possível evolução:

PWA
wrapper native
Design System

Camada separada que controla:

cores
tipografia
tokens
componentes
temas

Permite alterar aparência sem alterar lógica.

4. Estrutura da Interface

A interface segue um layout simples e consistente.

Estrutura principal:

Header
Main Content
ActivityPanel
Primary Action

Hierarquia visual:

STATUS
↓
AÇÃO PRINCIPAL
↓
DETALHES
↓
LOG / DIAGNÓSTICO

Isso garante que o utilizador entende sempre:

o que está a acontecer
o que pode fazer
5. Fluxos do Utilizador

Existem três perfis principais.

Passenger
Driver
Admin
Passenger Flow

Fluxo simplificado:

abrir app
pedir viagem
aguardar motorista
iniciar viagem
terminar viagem

Princípios:

ação clara
feedback constante
zero ambiguidade
Driver Flow

Fluxo:

ficar disponível
receber pedido
aceitar viagem
recolher passageiro
terminar viagem

Motorista deve sentir:

controlo
clareza
rapidez
Admin Flow

Painel técnico usado para:

gestão de utilizadores
aprovação
observação de atividade
debug

Admin não faz parte da experiência pública.

6. Design Philosophy

A interface segue três ideias fundamentais.

1. Action First

Sempre existe uma ação clara.

Exemplo:

botão principal
2. Calm Environment

A interface não deve parecer agressiva.

Usa:

gradientes suaves
formas orgânicas
cores equilibradas
3. Legibility

Cards e texto devem ser sempre legíveis.

Mesmo com fundo atmosférico.

7. Sistema Visual

A UI baseia-se em três camadas visuais.

Camada 1 – Gradiente

Gradiente diagonal suave.

Distribuição:

0%
38%
100%

Inspiração:

crescimento natural
fibonacci-like
Camada 2 – Forma Orgânica

Uma forma abstrata que cria profundidade.

Características:

suave
grande
quase invisível

Cada tema altera esta forma.

Camada 3 – Textura

Ruído muito leve inspirado em:

papel japonês

Objetivo:

evitar sensação "flat"
8. Sistema de Componentes

Componentes principais.

PrimaryActionButton

Elemento mais importante da interface.

Características:

pill
≥52px altura
gradiente
micro-interações
Cards

Utilizados para:

viagens
pedidos
informação

Características:

rounded
shadow
blur leve
StatusHeader

Mostra estado da viagem.

Exemplos:

requested
accepted
ongoing
completed

Transições suaves entre estados.

ActivityPanel

Painel técnico.

Mostra:

logs
estado
debug

Deve ser discreto.

9. Sistema de Temas

Temas controlam:

cores
gradientes
shape

Não alteram layout.

Temas atuais:

Portugal
Portugal Dark
Minimal
Neon

Temas futuros:

Ocean
Forest
Fire
Sakura
Steampunk
10. Estado Atual do Projeto

Elementos já sólidos:

design system
layout mobile-first
botões principais
cards
temas
fundo atmosférico
11. Lacunas Funcionais

Para atingir paridade com Uber/Bolt faltam:

mapa
localização GPS
matching automático
tracking de viagem
estimativa de preço
notificações

Estas serão fases futuras.

12. Roadmap até Abril

Prioridade deve ser:

mapas
localização
tracking
UX final

Evitar excesso de polimento visual.

13. Princípio de Evolução

A aplicação deve evoluir através de:

tokens
componentes
temas

e não através de reestruturação constante.

14. Filosofia de Produto

A app não tenta reinventar o ride-sharing.

Objetivo é:

ser clara
ser confiável
ser rápida

Uma boa aplicação de mobilidade não deve parecer complexa.

Deve parecer:

óbvia
15. Conclusão

O projeto encontra-se numa fase onde:

arquitetura base está sólida
UI coerente
design system funcional

O foco agora deve ser:

funcionalidade real
testes humanos
iteração rápida