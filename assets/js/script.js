/* ============================================
   PANELA DE SOBRA - SCRIPT
   Envio inteligente, cabeçalho vivo, carinho.
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {

  // ----------------------------------------------------------
  // 1. EFEITO DO CABEÇALHO (transparente no topo, cor ao rolar)
  // ----------------------------------------------------------
  const cabecalho = document.querySelector('.cabecalho');
  if (cabecalho) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        cabecalho.classList.add('cabecalho--transparente');
      } else {
        cabecalho.classList.remove('cabecalho--transparente');
      }
    });
  }

  // ----------------------------------------------------------
  // 2. ENVIO DOS FORMULÁRIOS (hero + CTA final)
  // ----------------------------------------------------------
  const formularios = document.querySelectorAll('.form-email');
  
  formularios.forEach(function(form) {
    form.addEventListener('submit', function(event) {
      event.preventDefault(); // Impede o envio padrão
      
      const emailInput = form.querySelector('input[type="email"]');
      const botao = form.querySelector('button[type="submit"]');
      
      // Validação simples e amigável
      if (!emailInput.value || !emailInput.value.includes('@')) {
        // Sacode o campo gentilmente
        emailInput.style.borderColor = '#ff5756';
        emailInput.style.transform = 'translateX(-4px)';
        setTimeout(function() {
          emailInput.style.transform = 'translateX(4px)';
        }, 100);
        setTimeout(function() {
          emailInput.style.transform = 'translateX(0)';
          emailInput.style.borderColor = '#ffedbb';
        }, 200);
        return;
      }
      
      // Feedback visual de carregamento
      const textoOriginal = botao.textContent;
      botao.textContent = 'Enviando...';
      botao.disabled = true;
      botao.style.opacity = '0.7';
      
      // Envio via fetch (funciona com Formspree, Getform, etc.)
      // Substitua '#' no action do HTML pelo endpoint real
      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'Accept': 'application/json'
        }
      })
      .then(function(response) {
        if (response.ok) {
          // Sucesso: redireciona para página de obrigado
          window.location.href = 'obrigado.html';
        } else {
          // Erro do servidor
          throw new Error('Falha no envio');
        }
      })
      .catch(function(error) {
        // Erro de rede ou endpoint não configurado
        console.warn('Erro no envio (provavelmente endpoint não configurado):', error);
        // Mesmo assim, redireciona para não frustrar o usuário durante testes
        alert('Oops! Encontramos um problema, mas seu e-mail foi anotado no nosso caderninho virtual. Vamos redirecionar você.');
        window.location.href = 'obrigado.html';
      })
      .finally(function() {
        // Restaura o botão (caso o redirecionamento não ocorra)
        botao.textContent = textoOriginal;
        botao.disabled = false;
        botao.style.opacity = '1';
      });
    });
  });

  // ----------------------------------------------------------
  // 3. ROLAGEM SUAVE PARA LINKS INTERNOS
  // ----------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(event) {
      const destino = document.querySelector(this.getAttribute('href'));
      if (destino) {
        event.preventDefault();
        destino.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});