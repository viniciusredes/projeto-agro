import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FotoOS } from '@/models/ordem-servico';
import { enderecoDaFoto, MAXIMO_FOTOS_POR_OS } from '@/servicos/fotos-os';
import { useTema } from '@/tema';
import { formatarTamanho } from '@/validacao';

// Fotos da O.S. aberta: miniaturas lado a lado; um toque abre a foto na tela cheia.
// O <Image> baixa cada foto direto da API, pela url (o JSON da ficha só traz os dados).
//
// resizeMethod="resize" (Android): a foto do celular tem ~3000 x 4000 pixels. Sem isso, o Android
// tenta montar a imagem INTEIRA na memória (~50 MB) e ela simplesmente não aparece. Com "resize",
// a foto é reduzida ao tamanho da miniatura ANTES de ser montada. (No navegador isso é automático.)
export function GaleriaFotos({ fotos }: { fotos: FotoOS[] }) {
  const tema = useTema();
  // Qual foto está aberta na tela cheia (null = nenhuma). O índice permite mostrar "2 de 3".
  const [aberta, setAberta] = useState<number | null>(null);
  const foto = aberta !== null ? fotos[aberta] : null;
  // Fotos que falharam ao carregar: mostram um aviso em vez de um quadrado vazio
  const [comErro, setComErro] = useState<number[]>([]);
  const marcarErro = (id: number) => setComErro(ids => (ids.includes(id) ? ids : [...ids, id]));

  return (
    <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
      <Text style={[estilos.titulo, { color: tema.texto }]}>
        Fotos da avaria · {fotos.length} de {MAXIMO_FOTOS_POR_OS}
      </Text>

      {fotos.length === 0 ? (
        <Text style={[estilos.texto, { color: tema.textoSuave }]}>Nenhuma foto ainda.</Text>
      ) : (
        // horizontal: as miniaturas rolam para o lado, sem empurrar o resto da ficha
        <ScrollView horizontal contentContainerStyle={estilos.miniaturas} showsHorizontalScrollIndicator={false}>
          {fotos.map((f, indice) => (
            <Pressable
              key={f.id}
              onPress={() => setAberta(indice)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Foto ${indice + 1} de ${fotos.length}. Toque para ampliar`}
            >
              {comErro.includes(f.id) ? (
                <View style={[estilos.miniatura, estilos.falhou, { backgroundColor: tema.borda }]}>
                  <Text style={[estilos.falhouTexto, { color: tema.texto }]}>Não carregou</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: enderecoDaFoto(f) }}
                  resizeMethod="resize"
                  onError={() => marcarErro(f.id)}
                  style={[estilos.miniatura, { backgroundColor: tema.borda }]}
                />
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Modal: uma camada por cima do app inteiro. O botão Voltar do Android chama o onRequestClose */}
      <Modal visible={foto !== null} animationType="fade" onRequestClose={() => setAberta(null)}>
        <View style={estilos.telaCheia}>
          {foto && (
            <>
              <Image
                source={{ uri: enderecoDaFoto(foto) }}
                style={estilos.fotoCheia}
                resizeMode="contain"
                resizeMethod="resize"
                onError={() => marcarErro(foto.id)}
              />
              {comErro.includes(foto.id) && (
                <Text style={estilos.legenda}>Não foi possível carregar esta foto. Confira a conexão com a API.</Text>
              )}
              <Text style={estilos.legenda}>
                Foto {aberta! + 1} de {fotos.length} ·{' '}
                {new Date(foto.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                {formatarTamanho(foto.tamanho)}
              </Text>
            </>
          )}
          <Pressable
            onPress={() => setAberta(null)}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.fechar, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={estilos.fecharTexto}>Fechar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  titulo: { fontSize: 17, fontWeight: '700' },
  texto: { fontSize: 15 },
  miniaturas: { gap: 10 },
  miniatura: { width: 96, height: 96, borderRadius: 10 },
  falhou: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  falhouTexto: { fontSize: 13, textAlign: 'center' },
  telaCheia: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 16, gap: 16 },
  fotoCheia: { width: '100%', flex: 1 },
  legenda: { color: '#ffffff', fontSize: 15, textAlign: 'center' },
  fechar: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fecharTexto: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
