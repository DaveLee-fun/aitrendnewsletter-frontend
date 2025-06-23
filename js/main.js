// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show success message
function showSuccessMessage(form) {
    const originalContent = form.innerHTML;
    form.innerHTML = `
        <div class="text-center p-8">
            <div class="text-4xl mb-4">✅</div>
            <h3 class="text-2xl font-bold mb-2 text-green-600">구독 완료!</h3>
            <p class="text-gray-700">곧 받은편지함에서 첫 번째 뉴스레터를 확인하실 수 있습니다.</p>
        </div>
    `;
    
    // Reset form after 5 seconds
    setTimeout(() => {
        form.innerHTML = originalContent;
        attachFormListeners();
    }, 5000);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput.value;
    
    if (!validateEmail(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }
    
    // Get all checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    let allChecked = true;
    
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            allChecked = false;
        }
    });
    
    if (checkboxes.length > 0 && !allChecked) {
        alert('모든 항목에 동의해주세요.');
        return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '처리 중...';
    
    try {
        // Send to backend API (will be handled by Cloudflare Workers)
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                source: form.id || 'landing_page'
            })
        });
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            // If response is not JSON (like HTML error page), throw error
            throw new Error('Server error: ' + response.status);
        }
        
        if (response.ok) {
            showSuccessMessage(form);
            // Clear the email input
            emailInput.value = '';
        } else {
            throw new Error(data.error || 'Subscription failed');
        }
        
        // Track conversion (for analytics)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'sign_up', {
                'method': 'email',
                'form_id': form.id
            });
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        
        // For development: save to localStorage if backend is not ready
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch') || error.message.includes('Server error')) {
            const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
            subscribers.push({ email, timestamp: new Date().toISOString(), source: form.id });
            localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
            showSuccessMessage(form);
            emailInput.value = '';
            return; // Exit early to avoid resetting button twice
        } else {
            alert('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.05,
        rootMargin: '0px 0px -10px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add animation class and set opacity to 1
                entry.target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all sections (exclude hero section)
    document.querySelectorAll('section:not(.hero-gradient)').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        observer.observe(section);
    });
}

// Attach event listeners to forms
function attachFormListeners() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit);
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    attachFormListeners();
    initSmoothScroll();
    initScrollAnimations();
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.hover\\:shadow-lg');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add floating animation to hero elements
    const heroElements = document.querySelectorAll('.animate-float');
    heroElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.5}s`;
    });
    
    // Countdown timer for urgency (optional)
    const urgencySection = document.querySelector('.bg-red-50');
    if (urgencySection) {
        const spots = Math.floor(Math.random() * 50) + 100;
        const spotsElement = document.createElement('p');
        spotsElement.className = 'text-center mt-8 text-red-600 font-bold text-lg';
        spotsElement.textContent = `⚠️ 남은 무료 구독 자리: ${spots}명`;
        urgencySection.querySelector('.container').appendChild(spotsElement);
        
        // Update spots every few seconds
        setInterval(() => {
            const currentSpots = parseInt(spotsElement.textContent.match(/\d+/)[0]);
            if (currentSpots > 10) {
                const newSpots = currentSpots - Math.floor(Math.random() * 3) - 1;
                spotsElement.textContent = `⚠️ 남은 무료 구독 자리: ${newSpots}명`;
            }
        }, 30000);
    }
});

// Handle visibility change (pause animations when tab is not visible)
document.addEventListener('visibilitychange', () => {
    const animations = document.querySelectorAll('.animate-float, .animate-pulse-slow');
    animations.forEach(el => {
        if (document.hidden) {
            el.style.animationPlayState = 'paused';
        } else {
            el.style.animationPlayState = 'running';
        }
    });
});