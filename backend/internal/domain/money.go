// Package domain é o coração do sistema: as regras de negócio do ERP.
//
// REGRA DE OURO DESTE PACOTE: ele não importa nada de fora (nem banco, nem HTTP,
// nem TigerBeetle). Só a biblioteca padrão do Go. Isso é o "D" de DDD na prática:
// dá para ler este pacote inteiro e entender o negócio sem saber onde os dados
// são guardados.
//
// Analogia com React: pense no domain como as suas funções puras e os seus types
// de `src/lib/` — sem fetch, sem hooks, sem JSX. Fáceis de testar.
package domain

import "fmt"

// Money é um valor em CENTAVOS guardado como inteiro.
//
// Por que não float64? Porque 0.1 + 0.2 != 0.3 em ponto flutuante (igual ao
// `number` do JavaScript). Em contabilidade um centavo perdido é um bug sério,
// então todo sistema financeiro guarda a menor unidade da moeda como inteiro.
// O TigerBeetle faz o mesmo: o campo `amount` é um inteiro de 128 bits.
//
// `type Money int64` cria um TIPO NOVO baseado em int64. Não é um alias: o
// compilador não deixa somar Money com int64 por engano, nem passar uma
// quantidade (int) onde se espera dinheiro. É como um "branded type" do
// TypeScript, só que de graça e verificado de verdade.
type Money int64

// String faz Money satisfazer a interface fmt.Stringer. Qualquer tipo com um
// método `String() string` é impresso assim por fmt.Println, %s e %v.
// (Equivale a implementar toString() em JS.)
//
// O `(m Money)` antes do nome é o RECEIVER: é o que transforma a função em
// método. Go não tem classes; tem tipos + funções ligadas a eles.
func (m Money) String() string {
	sign := ""
	if m < 0 {
		sign = "-"
		m = -m
	}
	reais, cents := int64(m)/100, int64(m)%100
	return fmt.Sprintf("%sR$ %s,%02d", sign, groupThousands(reais), cents)
}

// Times multiplica um valor unitário por uma quantidade (preço x unidades).
func (m Money) Times(qty int) Money { return m * Money(qty) }

// groupThousands escreve 1234567 como "1.234.567" (padrão brasileiro).
// Começa com letra minúscula, portanto é PRIVADA ao pacote: em Go a
// visibilidade é decidida pela primeira letra do nome. Maiúscula = exportado
// (como `export` em JS); minúscula = só este pacote enxerga.
func groupThousands(n int64) string {
	s := fmt.Sprint(n)
	out := ""
	for i, digit := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			out += "."
		}
		out += string(digit)
	}
	return out
}
