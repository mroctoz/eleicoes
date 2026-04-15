// ==============================================================================
// ATLAS ELEITORAL - LÓGICA PRINCIPAL (FRONT-END)
// ==============================================================================

// 1. INICIALIZAÇÃO DO MAPA
// Coordenadas de Boa Vista (Roraima) como ponto de partida
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center:[-60.6733, 2.8197], // Longitude, Latitude de RR
    zoom: 6, // Zoom mais distante para ver o estado
    pitch: 0,
    maxZoom: 18,
    minZoom: 4
});

// Adiciona controles de zoom e rotação
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

// 2. FUNÇÃO QUE BUSCA OS DADOS REAIS NO GITHUB/PASTA
async function carregarDados(ano, cargo, estado) {
    // Monta o caminho exato onde o arquivo está guardado
    const caminhoArquivo = `dados/${ano}/${cargo}/${estado}.geojson`;
    console.log(`Buscando dados em: ${caminhoArquivo}`);

    try {
        // O comando FETCH busca o arquivo na pasta (ou no servidor do GitHub)
        const resposta = await fetch(caminhoArquivo);
        
        if (!resposta.ok) {
            throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
        }

        const dadosGeoJson = await resposta.json();
        console.log(`Sucesso! Foram carregados ${dadosGeoJson.features.length} colégios eleitorais.`);

        // Se a fonte de dados já existe no mapa, atualizamos. Se não, criamos.
        if (map.getSource('locais-votacao')) {
            map.getSource('locais-votacao').setData(dadosGeoJson);
        } else {
            map.addSource('locais-votacao', {
                type: 'geojson',
                data: dadosGeoJson
            });

            // Adiciona a camada visual (As bolinhas)
            map.addLayer({
                id: 'pontos-locais',
                type: 'circle',
                source: 'locais-votacao',
                paint: {
                    // O tamanho da bolinha baseia-se no TOTAL_VOTOS que o Colab calculou
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        6, ['/',['get', 'TOTAL_VOTOS'], 1000],  // Visão de longe
                        15,['/', ['get', 'TOTAL_VOTOS'], 200]   // Visão de perto (zoom)
                    ],
                    // A cor da bolinha será o padrão azul claro premium (já que não temos os partidos mapeados ainda)
                    'circle-color': '#3b82f6',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#1e293b',
                    'circle-opacity': 0.8
                }
            });

            // 3. INTERATIVIDADE (Passar o mouse e Clicar)
            map.on('mouseenter', 'pontos-locais', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'pontos-locais', () => {
                map.getCanvas().style.cursor = '';
            });

            // O que acontece quando clica na bolinha?
            map.on('click', 'pontos-locais', (e) => {
                const propriedades = e.features[0].properties;
                
                // Centraliza no local clicado
                map.flyTo({
                    center: e.features[0].geometry.coordinates,
                    zoom: 14,
                    essential: true
                });

                abrirPainelDetalhes(propriedades);
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar o mapa: ", erro);
        alert(`Não foi possível carregar os dados de ${estado} (${ano}). Verifique se o arquivo existe na pasta correta.`);
    }
}

// 4. FUNÇÃO QUE MONTA O PAINEL LATERAL COM OS RESULTADOS
const painelDetalhes = document.getElementById('details-panel');
const btnFechar = document.getElementById('close-details');

btnFechar.addEventListener('click', () => {
    painelDetalhes.classList.add('translate-x-full');
});

function abrirPainelDetalhes(props) {
    // Preenche o cabeçalho com os dados vindos do Colab
    document.getElementById('lbl-zona').textContent = props.ZONA;
    document.getElementById('lbl-local').textContent = props.LOCAL;
    document.getElementById('lbl-escola').textContent = props.ESCOLA;
    document.getElementById('lbl-eleitores').textContent = props.TOTAL_VOTOS.toLocaleString('pt-BR');
    document.getElementById('lbl-secoes').textContent = "--"; // Opcional, se não tivermos no momento

    // LER OS RESULTADOS (O MapLibre transforma Arrays/Objetos em Strings, então precisamos do JSON.parse)
    let resultados =[];
    try {
        resultados = typeof props.RESULTADOS === 'string' ? JSON.parse(props.RESULTADOS) : props.RESULTADOS;
    } catch (e) {
        console.error("Erro ao ler resultados: ", e);
    }

    const divLista = document.getElementById('candidatos-lista');
    divLista.innerHTML = '';

    // Cores Premium para os 3 primeiros colocados (Ouro, Prata, Bronze), depois Cinza
    const coresColocacao =['border-yellow-500', 'border-slate-300', 'border-orange-700'];

    // Monta o Card para cada candidato
    resultados.forEach((cand, index) => {
        const corBorda = coresColocacao[index] || 'border-slate-600';
        
        const divCard = document.createElement('div');
        divCard.className = `flex items-center justify-between bg-slate-800 p-4 rounded-lg border-l-4 ${corBorda} shadow-md transition hover:bg-slate-750`;
        
        divCard.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-slate-700 rounded border border-slate-600 flex items-center justify-center overflow-hidden relative shadow-inner">
                    <i class="fa-solid fa-user-tie text-2xl text-slate-400"></i>
                </div>
                <div>
                    <div class="text-sm font-bold text-white uppercase tracking-wide truncate w-32" title="${cand.nome}">${cand.nome}</div>
                    <div class="text-xs text-slate-400 font-medium">Candidato</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-lg font-bold text-white">${cand.pct.toFixed(1)}%</div>
                <div class="text-xs text-slate-400">${cand.votos.toLocaleString('pt-BR')} votos</div>
            </div>
        `;
        divLista.appendChild(divCard);
    });

    // Abre a aba lateral
    painelDetalhes.classList.remove('translate-x-full');
}

// 5. GATILHO INICIAL QUANDO O MAPA TERMINA DE CARREGAR
map.on('load', () => {
    // Assim que a página abrir, ele busca automaticamente 2022, Governador, RR
    carregarDados('2022', 'governador', 'RR');
});

// Funcionalidade do botão "Atualizar Dados" lá no topo do HTML
document.querySelector('button').addEventListener('click', () => {
    // Pega o que o usuário escolheu no HTML
    const anoSelecionado = document.getElementById('ano-select').value;
    const cargoSelecionado = document.getElementById('cargo-select').value;
    
    // Por enquanto, testando fixo em RR. Depois teremos um select de estados!
    carregarDados(anoSelecionado, cargoSelecionado, 'RR');
});
