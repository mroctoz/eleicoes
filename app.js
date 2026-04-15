// app.js

/**
 * FASE 1: DADOS MOCKADOS (A "Marmita" de Teste)
 * Em produção, esses dados viriam de arquivos .geojson gerados pela sua "Cozinha".
 * O Ponto 1 usa as coordenadas exatas que você me enviou na Malha LV.
 */

const DADOS_LOCAIS = {
    "type": "FeatureCollection",
    "features":[
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates":[-46.4619246, -23.6287137] },
            "properties": {
                "CD_MUNICIP": 71072,
                "NR_ZONA": 375,
                "NR_LOCAL_V": 2097,
                "NM_ESCOLA": "E.E. PROFESSOR LUIZ ROBERTO JABALI",
                "QTD_ELEITORES": 4250,
                "QTD_SECOES": 12,
                "VENCEDOR": "CandA" // Para colorir a bolinha
            }
        },
        // Pontos fictícios ao redor para demonstrar o mapa
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates":[-46.4710000, -23.6300000] },
            "properties": {
                "CD_MUNICIP": 71072,
                "NR_ZONA": 375,
                "NR_LOCAL_V": 2098,
                "NM_ESCOLA": "EMEF JOSÉ DE ALENCAR",
                "QTD_ELEITORES": 3100,
                "QTD_SECOES": 8,
                "VENCEDOR": "CandB"
            }
        },
        {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates":[-46.4550000, -23.6200000] },
            "properties": {
                "CD_MUNICIP": 71072,
                "NR_ZONA": 375,
                "NR_LOCAL_V": 2099,
                "NM_ESCOLA": "COLÉGIO ESTADUAL SÃO PAULO",
                "QTD_ELEITORES": 5800,
                "QTD_SECOES": 15,
                "VENCEDOR": "CandA"
            }
        }
    ]
};

// Banco de dados simulado de resultados exatos por LOCAL DE VOTAÇÃO
const RESULTADOS_DETALHADOS = {
    2097:[
        { nome: "Candidato A", partido: "Partido X", votos: 2150, pct: 55.8, cor: "bg-red-500", foto: "fa-user-tie" },
        { nome: "Candidato B", partido: "Partido Y", votos: 1700, pct: 44.2, cor: "bg-blue-500", foto: "fa-user" }
    ],
    2098:[
        { nome: "Candidato B", partido: "Partido Y", votos: 1600, pct: 58.1, cor: "bg-blue-500", foto: "fa-user" },
        { nome: "Candidato A", partido: "Partido X", votos: 1150, pct: 41.9, cor: "bg-red-500", foto: "fa-user-tie" }
    ],
    2099:[
        { nome: "Candidato A", partido: "Partido X", votos: 3000, pct: 60.0, cor: "bg-red-500", foto: "fa-user-tie" },
        { nome: "Candidato B", partido: "Partido Y", votos: 2000, pct: 40.0, cor: "bg-blue-500", foto: "fa-user" }
    ]
};


/**
 * FASE 2: INICIALIZAÇÃO DO MAPA
 */

// Usamos um mapa base escuro (Dark Matter) gratuito via CartoDB para combinar com o layout
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center:[-46.4619246, -23.6287137], // Centraliza na coordenada que você forneceu
    zoom: 13,
    pitch: 0,
    maxZoom: 18,
    minZoom: 4
});

// Adiciona controles de zoom e rotação no canto inferior direito
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

/**
 * FASE 3: CARREGAR DADOS NO MAPA
 */
map.on('load', () => {
    
    // 1. Adicionamos a Fonte de Dados (GeoJSON)
    map.addSource('locais-votacao', {
        type: 'geojson',
        data: DADOS_LOCAIS
    });

    // 2. Adicionamos a Camada Visual (Como os dados serão desenhados)
    map.addLayer({
        id: 'pontos-locais',
        type: 'circle',
        source: 'locais-votacao',
        paint: {
            // O tamanho da bolinha muda com o zoom e com a quantidade de eleitores
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, ['/',['get', 'QTD_ELEITORES'], 1000], // Zoom longe: menor
                15, ['/',['get', 'QTD_ELEITORES'], 300]   // Zoom perto: maior
            ],
            // A cor da bolinha muda dependendo do vencedor
            'circle-color': [
                'match',['get', 'VENCEDOR'],
                'CandA', '#ef4444', // Vermelho (Tailwind red-500)
                'CandB', '#3b82f6', // Azul (Tailwind blue-500)
                '#94a3b8' // Cor padrão (cinza)
            ],
            // Contorno da bolinha
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
        }
    });

    /**
     * FASE 4: INTERATIVIDADE (O Clique na Bolinha)
     */
    
    // Muda o cursor para "mãozinha" ao passar sobre os pontos
    map.on('mouseenter', 'pontos-locais', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'pontos-locais', () => {
        map.getCanvas().style.cursor = '';
    });

    // Evento de Clique
    map.on('click', 'pontos-locais', (e) => {
        // Pega os dados da bolinha clicada
        const propriedades = e.features[0].properties;
        
        // Centraliza o mapa no ponto clicado de forma suave
        map.flyTo({
            center: e.features[0].geometry.coordinates,
            zoom: 15,
            essential: true
        });

        // Atualiza a Interface do Usuário (Painel da Direita)
        abrirPainelDetalhes(propriedades);
    });
});

/**
 * FASE 5: ATUALIZAÇÃO DA INTERFACE (DOM Manipulation)
 */

const painelDetalhes = document.getElementById('details-panel');
const btnFechar = document.getElementById('close-details');

// Fecha o painel
btnFechar.addEventListener('click', () => {
    painelDetalhes.classList.add('translate-x-full');
});

// Função para injetar os dados HTML no painel lateral
function abrirPainelDetalhes(props) {
    // 1. Atualiza os cabeçalhos
    document.getElementById('lbl-zona').textContent = props.NR_ZONA;
    document.getElementById('lbl-local').textContent = props.NR_LOCAL_V;
    document.getElementById('lbl-escola').textContent = props.NM_ESCOLA;
    document.getElementById('lbl-eleitores').textContent = props.QTD_ELEITORES.toLocaleString('pt-BR');
    document.getElementById('lbl-secoes').textContent = props.QTD_SECOES;

    // 2. Busca os resultados exatos no banco de dados simulado
    const resultados = RESULTADOS_DETALHADOS[props.NR_LOCAL_V] ||[];
    const divLista = document.getElementById('candidatos-lista');
    
    // Limpa a lista atual
    divLista.innerHTML = '';

    // 3. Monta o HTML para cada candidato
    resultados.forEach(cand => {
        const divCard = document.createElement('div');
        divCard.className = `flex items-center justify-between bg-slate-800 p-4 rounded-lg border-l-4 ${cand.cor} shadow-md`;
        
        divCard.innerHTML = `
            <div class="flex items-center gap-4">
                <!-- Foto do Candidato (Usando Font Awesome como Fallback) -->
                <div class="w-12 h-12 bg-slate-700 rounded border border-slate-600 flex items-end justify-center overflow-hidden relative">
                    <!-- Se tivéssemos o link do TSE: <img src="link_tse" class="w-full h-full object-cover"> -->
                    <i class="fa-solid ${cand.foto} text-3xl text-slate-400 absolute -bottom-1"></i>
                </div>
                <div>
                    <div class="text-base font-bold text-white">${cand.nome}</div>
                    <div class="text-xs text-slate-400 font-medium">${cand.partido}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-lg font-bold text-white">${cand.pct.toFixed(1)}%</div>
                <div class="text-xs text-slate-400">${cand.votos.toLocaleString('pt-BR')} votos</div>
            </div>
        `;
        divLista.appendChild(divCard);
    });

    // Abre o painel deslizando-o para a esquerda
    painelDetalhes.classList.remove('translate-x-full');
}
