document.addEventListener('DOMContentLoaded', () => {
    const radioOutro = document.getElementById('radio-outro');
    const radios = document.querySelectorAll('input[name="valor_doacao"]');
    const inputOutroContainer = document.getElementById('input-outro-container');
    const btnDoar = document.getElementById('btn-doar');
    const pixArea = document.getElementById('pix-area');

    // Toggle custom input field
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'outro') {
                inputOutroContainer.style.display = 'block';
            } else {
                inputOutroContainer.style.display = 'none';
            }
        });
    });

    // Integração Real: Chamada para Cloud Function (gerarPixVakinha)
    btnDoar.addEventListener('click', async () => {
        let valor = document.querySelector('input[name="valor_doacao"]:checked')?.value;
        if (valor === 'outro') {
            valor = document.getElementById('valor-personalizado').value;
        }

        if (!valor || valor <= 0) {
            alert('Por favor, selecione ou digite um valor válido.');
            return;
        }

        let nomeDoador = document.getElementById('nome-apoiador')?.value?.trim();
        if (!nomeDoador) {
            nomeDoador = 'Anônimo';
        }

        btnDoar.innerText = 'Gerando PIX...';
        btnDoar.disabled = true;

        try {
            // Chamando a Cloud Function onCall
            const response = await fetch('https://southamerica-east1-panela-de-sobra.cloudfunctions.net/gerarPixVakinha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { valor: Number(valor), nome: nomeDoador } })
            });
            const resultData = await response.json();

            if (resultData.error) {
                throw new Error(resultData.error.message);
            }

            const payload = resultData.result;

            // Injetando no HTML
            document.getElementById('pix-copia-cola').value = payload.qr_code;
            document.getElementById('pix-qrcode-placeholder').innerHTML = `<img src="data:image/png;base64,${payload.qr_code_base64}" alt="QR Code PIX" style="width: 150px; height: 150px; border-radius: 8px;">`;

            btnDoar.style.display = 'none';
            pixArea.style.display = 'block';

            // Dica de UX para o doador
            setTimeout(() => alert('QRcode gerado! Agora é só copiar o código, colar na área PIX do seu banco e efetuar o pagamento!'), 1000);

        } catch (err) {
            console.error(err);

            if (err.message === 'INTERNAL') {
                alert('Erro Interno no Servidor (500).\n\nMaiteux, a requisição chegou na Cloud Function da Bia, mas a função "gerarPixVakinha" quebrou durante a execução. O Firebase esconde o motivo por segurança (chamando apenas de INTERNAL).\n\nCausas mais prováveis:\n1. O secret MERCADOPAGO_ACCESS_TOKEN não foi configurado no Secret Manager do GCP.\n2. A API do Mercado Pago recusou a transação de teste.\n\nPor favor, olhe os logs dessa função no painel do Firebase para ver o erro exato!');
            } else {
                alert('Erro ao gerar o PIX: ' + err.message);
            }

            btnDoar.innerText = 'Gerar PIX';
            btnDoar.disabled = false;
        }
    });

    // Lógica de Atualização da Barra de Progresso
    function atualizarProgresso(totalArrecadado) {
        let progressoBarra = 0;
        let metaAtual = 1500;
        let titulo = '';
        let desc = '';
        let conquista = '';

        if (totalArrecadado < 1500) {
            progressoBarra = totalArrecadado;
            metaAtual = 1500;
            titulo = 'Meta Atual: 3 Semanas de operação!';
            desc = 'Precisamos de R$ 1.500 para cobrir os custos iniciais dos servidores.';
            conquista = '';
        } else if (totalArrecadado < 2000) {
            progressoBarra = totalArrecadado - 1500;
            metaAtual = 500;
            titulo = 'Meta Atual: Pagamento da anuidade do iOS!';
            desc = 'Precisamos de R$ 500 para cobrir a taxa de $99 USD da Apple Developer Account.';
            conquista = '3 semanas de operação do app garantidas!';
        } else {
            let restante = totalArrecadado - 2000;
            let metasExtras = Math.floor(restante / 500);
            progressoBarra = restante % 500;
            metaAtual = 500;
            titulo = 'Meta Atual: +1 semana de trabalho dedicada!';
            desc = 'A cada R$ 500, garantimos mais uma semana de trabalho dedicada para melhorar o app.';
            conquista = `Anuidade iOS e ${3 + metasExtras} semanas garantidas!`;
        }

        const porcentagem = (progressoBarra / metaAtual) * 100;
        document.getElementById('barra-progresso').style.width = `${porcentagem}%`;
        document.getElementById('valor-arrecadado').innerText = `R$ ${progressoBarra.toFixed(2).replace('.', ',')}`;
        document.getElementById('valor-objetivo').innerText = `R$ ${metaAtual.toFixed(2).replace('.', ',')}`;

        document.getElementById('meta-titulo-texto').innerText = titulo;
        document.getElementById('meta-desc-texto').innerText = desc;

        const containerConquista = document.getElementById('vakinha-conquista');
        if (conquista) {
            containerConquista.style.display = 'block';
            document.getElementById('conquista-texto').innerText = conquista;
        } else {
            containerConquista.style.display = 'none';
        }
    }

    // Leitura em tempo real do Firestore usando REST API (Polling a cada 5s)
    async function checarProgresso() {
        try {
            const res = await fetch('https://firestore.googleapis.com/v1/projects/panela-de-sobra/databases/(default)/documents/vakinha/status');

            if (res.status === 404) {
                atualizarProgresso(0);
                return;
            }

            const data = await res.json();
            if (data.fields && data.fields.totalArrecadado) {
                atualizarProgresso(Number(data.fields.totalArrecadado.integerValue || data.fields.totalArrecadado.doubleValue || 0));
            }
        } catch (e) {
            console.warn('Erro ao ler progresso:', e);
        }
    }

    // Checa ao carregar a página e fica monitorando
    checarProgresso();
    carregarApoiadores();
    setInterval(checarProgresso, 5000);
    setInterval(carregarApoiadores, 15000); // Polling menos frequente para a lista
});

// Busca e renderiza os apoiadores
async function carregarApoiadores() {
    try {
        const res = await fetch('https://firestore.googleapis.com/v1/projects/panela-de-sobra/databases/(default)/documents/vakinha_transacoes');

        if (res.status !== 200) {
            throw new Error('Falha ou permissão negada');
        }

        const data = await res.json();
        const listaDiv = document.getElementById('lista-apoiadores');
        listaDiv.innerHTML = ''; // limpa loading

        if (!data.documents || data.documents.length === 0) {
            listaDiv.innerHTML = '<p style="color: #8B6F47; font-family: \'Nunito\', sans-serif; font-size: 1rem; text-align: center; margin: 20px 0;">Seja o primeiro a apoiar! 💛</p>';
            return;
        }

        // Filtra os que tem status approved
        let transacoes = data.documents
            .map(doc => {
                const f = doc.fields;
                return {
                    nome: f.nomeDoador?.stringValue || f.nome?.stringValue || f.metadata?.mapValue?.fields?.doador?.stringValue || 'Anônimo',
                    valor: Number(f.amount?.integerValue || f.amount?.doubleValue || 0),
                    status: f.status?.stringValue,
                    data: f.data?.stringValue || ''
                };
            })
            .filter(t => t.status === 'approved')
            .sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

        if (transacoes.length === 0) {
            listaDiv.innerHTML = '<p style="color: #8B6F47; font-family: \'Nunito\', sans-serif; font-size: 1rem; text-align: center; margin: 20px 0;">Nenhuma doação processada ainda.</p>';
            return;
        }

        transacoes.forEach(t => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #E4E4E4;';

            const nomeSpan = document.createElement('span');
            nomeSpan.style.cssText = 'font-family: \'Nunito\', sans-serif; font-weight: 600; color: #43411b;';
            nomeSpan.innerText = t.nome;

            const valorSpan = document.createElement('span');
            valorSpan.style.cssText = 'font-family: \'Nunito\', sans-serif; font-weight: 700; color: #ff7f00;';
            valorSpan.innerText = `R$ ${t.valor.toFixed(2).replace('.', ',')}`;

            item.appendChild(nomeSpan);
            item.appendChild(valorSpan);
            listaDiv.appendChild(item);
        });

    } catch (e) {
        // Se a API ainda não existir ou der 403 (antes da Bia configurar), silenciamos
        const listaDiv = document.getElementById('lista-apoiadores');
        listaDiv.innerHTML = '<p style="color: #8B6F47; font-family: \'Nunito\', sans-serif; font-size: 1rem; text-align: center; margin: 20px 0;">Preparando a lista de apoiadores...</p>';
    }
}

function copiarPix() {
    const input = document.getElementById('pix-copia-cola');
    input.select();
    document.execCommand('copy');
    alert('Código PIX copiado!');
}
