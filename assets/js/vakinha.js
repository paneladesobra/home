document.addEventListener('DOMContentLoaded', () => {
    const radioOutro = document.getElementById('radio-outro');
    const radios = document.querySelectorAll('input[name="valor_doacao"]');
    const inputOutroContainer = document.getElementById('input-outro-container');
    const btnDoar = document.getElementById('btn-doar');
    const pixArea = document.getElementById('pix-area');

    // Toggle custom input field
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'outro') {
                inputOutroContainer.style.display = 'block';
            } else {
                inputOutroContainer.style.display = 'none';
            }
        });
    });

    // Integração Real: Chamada para Cloud Function (gerarPixVakinha)
    btnDoar.addEventListener('click', async () => {
        let valor = document.querySelector('input[name="valor_doacao"]:checked')?.value;
        if(valor === 'outro') {
            valor = document.getElementById('valor-personalizado').value;
        }

        if(!valor || valor <= 0) {
            alert('Por favor, selecione ou digite um valor válido.');
            return;
        }

        btnDoar.innerText = 'Gerando PIX...';
        btnDoar.disabled = true;

        try {
            // Chamando a Cloud Function onCall
            const response = await fetch('https://southamerica-east1-panela-de-sobra.cloudfunctions.net/gerarPixVakinha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { valor: Number(valor) } })
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
            setTimeout(() => alert('Pronto! Pague o PIX e a barra verde vai subir sozinha!'), 1000);

        } catch (err) {
            console.error(err);
            alert('Erro ao gerar o PIX: ' + err.message);
            btnDoar.innerText = 'Gerar PIX';
            btnDoar.disabled = false;
        }
    });

    // Lógica de Atualização da Barra de Progresso
    function atualizarProgresso(totalArrecadado) {
        let semanas = 0;
        let progressoBarra = 0;
        let metaAtual = 1500;

        if (totalArrecadado >= 1500) {
            let restante = totalArrecadado - 1500;
            let metasExtras = Math.floor(restante / 500);
            semanas = 3 + metasExtras;
            progressoBarra = restante % 500;
            metaAtual = 500;
            
            document.getElementById('meta-titulo-texto').innerText = 'Meta Atual: Mais 1 semana!';
            document.getElementById('meta-desc-texto').innerText = 'Precisamos de R$ 500 para garantir a próxima semana de servidores.';
        } else {
            progressoBarra = totalArrecadado;
            metaAtual = 1500;
            
            document.getElementById('meta-titulo-texto').innerText = 'Meta Atual: 3 Semanas de operação!';
            document.getElementById('meta-desc-texto').innerText = 'Precisamos de R$ 1.500 para cobrir os custos iniciais dos servidores.';
        }

        const porcentagem = (progressoBarra / metaAtual) * 100;
        document.getElementById('barra-progresso').style.width = `${porcentagem}%`;
        document.getElementById('valor-arrecadado').innerText = `R$ ${progressoBarra.toFixed(2).replace('.', ',')}`;
        document.getElementById('valor-objetivo').innerText = `R$ ${metaAtual.toFixed(2).replace('.', ',')}`;

        if (semanas > 0) {
            const containerConquista = document.getElementById('vakinha-conquista');
            containerConquista.style.display = 'block';
            document.getElementById('conquista-texto').innerText = `${semanas} semanas de operação do app garantidas!`;
        } else {
            document.getElementById('vakinha-conquista').style.display = 'none';
        }
    }

    // Leitura em tempo real do Firestore usando REST API (Polling a cada 5s)
    async function checarProgresso() {
        try {
            const res = await fetch('https://firestore.googleapis.com/v1/projects/panela-de-sobra/databases/(default)/documents/vakinha/status');
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
    setInterval(checarProgresso, 5000);
});

function copiarPix() {
    const input = document.getElementById('pix-copia-cola');
    input.select();
    document.execCommand('copy');
    alert('Código PIX copiado!');
}
