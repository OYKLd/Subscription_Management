class SubscriptionManager {
    constructor() {
        this.subscriptions = [];
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.render();
        this.setDefaultDate();
    }

    setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('paymentDate');
        dateInput.value = today.toISOString().split('T')[0];
        dateInput.min = today.toISOString().split('T')[0];
    }

    bindEvents() {
        const form = document.getElementById('subscriptionForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubscription();
        });
    }

    loadFromStorage() {
        const stored = localStorage.getItem('subscriptions');
        if (stored) {
            this.subscriptions = JSON.parse(stored);
        }
    }

    saveToStorage() {
        localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));
    }

    addSubscription() {
        const form = document.getElementById('subscriptionForm');
        const formData = new FormData(form);
        
        const subscription = {
            id: Date.now().toString(),
            name: formData.get('name') || document.getElementById('name').value,
            price: parseFloat(formData.get('price') || document.getElementById('price').value),
            frequency: formData.get('frequency') || document.getElementById('frequency').value,
            paymentDate: formData.get('paymentDate') || document.getElementById('paymentDate').value,
            createdAt: new Date().toISOString()
        };

        this.subscriptions.push(subscription);
        this.saveToStorage();
        this.render();
        form.reset();
        this.setDefaultDate();
        
        this.showNotification('Abonnement ajouté avec succès!');
    }

    deleteSubscription(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet abonnement?')) {
            this.subscriptions = this.subscriptions.filter(sub => sub.id !== id);
            this.saveToStorage();
            this.render();
            this.showNotification('Abonnement supprimé avec succès!');
        }
    }

    calculateMonthlyTotal() {
        return this.subscriptions.reduce((total, sub) => {
            if (sub.frequency === 'monthly') {
                return total + sub.price;
            } else {
                return total + (sub.price / 12);
            }
        }, 0);
    }

    calculateAnnualTotal() {
        return this.subscriptions.reduce((total, sub) => {
            if (sub.frequency === 'annual') {
                return total + sub.price;
            } else {
                return total + (sub.price * 12);
            }
        }, 0);
    }

    getNextPayment() {
        if (this.subscriptions.length === 0) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let nextPayment = null;
        let minDiff = Infinity;

        this.subscriptions.forEach(sub => {
            const paymentDate = new Date(sub.paymentDate);
            const currentYear = today.getFullYear();
            
            let nextDate = new Date(currentYear, paymentDate.getMonth(), paymentDate.getDate());
            
            if (nextDate < today) {
                nextDate.setFullYear(currentYear + 1);
            }
            
            if (sub.frequency === 'monthly') {
                while (nextDate < today) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
            } else if (sub.frequency === 'annual') {
                while (nextDate < today) {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                }
            }
            
            const diff = nextDate - today;
            if (diff < minDiff) {
                minDiff = diff;
                nextPayment = {
                    date: nextDate,
                    name: sub.name,
                    price: sub.price,
                    frequency: sub.frequency
                };
            }
        });

        return nextPayment;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount).replace('XOF', 'FCFA');
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    }

    formatRelativeDate(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        const diff = targetDate - today;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return "Aujourd'hui";
        if (days === 1) return "Demain";
        if (days === -1) return "Hier";
        
        if (days > 0 && days <= 7) return `Dans ${days} jours`;
        if (days > 7 && days <= 30) return `Dans ${Math.floor(days / 7)} semaine${Math.floor(days / 7) > 1 ? 's' : ''}`;
        if (days > 30) return `Dans ${Math.floor(days / 30)} mois`;
        
        if (days < 0) return `Il y a ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
        
        return this.formatDate(date);
    }

    updateDashboard() {
        const monthlyTotal = this.calculateMonthlyTotal();
        const annualTotal = this.calculateAnnualTotal();
        const nextPayment = this.getNextPayment();

        document.getElementById('totalMonthly').textContent = this.formatCurrency(monthlyTotal);
        document.getElementById('totalAnnual').textContent = this.formatCurrency(annualTotal);
        
        const nextPaymentElement = document.getElementById('nextPayment');
        if (nextPayment) {
            nextPaymentElement.innerHTML = `
                <div>${this.formatRelativeDate(nextPayment.date)}</div>
                <small style="opacity: 0.7; font-weight: normal;">${nextPayment.name} - ${this.formatCurrency(nextPayment.price)}</small>
            `;
        } else {
            nextPaymentElement.textContent = 'Aucun';
        }
    }

    renderSubscriptions() {
        const container = document.getElementById('subscriptionsList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.subscriptions.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        container.innerHTML = this.subscriptions.map(sub => {
            const monthlyEquivalent = sub.frequency === 'annual' ? sub.price / 12 : sub.price;
            const nextPaymentDate = this.getNextPaymentDate(sub);
            
            return `
                <div class="subscription-card">
                    <button class="btn-delete" onclick="subscriptionManager.deleteSubscription('${sub.id}')" title="Supprimer">
                        ×
                    </button>
                    <div class="subscription-header">
                        <div>
                            <div class="subscription-name">${this.escapeHtml(sub.name)}</div>
                            <div class="subscription-frequency">${sub.frequency === 'monthly' ? 'mensuel' : 'annuel'}</div>
                        </div>
                        <div class="subscription-price">${this.formatCurrency(sub.price)}</div>
                    </div>
                    <div class="subscription-details">
                        <div class="subscription-date">
                            Prochain paiement: ${this.formatRelativeDate(nextPaymentDate)}
                        </div>
                        <div style="color: var(--text-tertiary); font-size: 0.75rem;">
                            ${this.formatCurrency(monthlyEquivalent)}/mois
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getNextPaymentDate(subscription) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const paymentDate = new Date(subscription.paymentDate);
        const currentYear = today.getFullYear();
        
        let nextDate = new Date(currentYear, paymentDate.getMonth(), paymentDate.getDate());
        
        if (nextDate < today) {
            if (subscription.frequency === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            } else {
                nextDate.setFullYear(currentYear + 1);
            }
        }
        
        return nextDate;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--secondary-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    render() {
        this.updateDashboard();
        this.renderSubscriptions();
    }
}

const subscriptionManager = new SubscriptionManager();

document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
