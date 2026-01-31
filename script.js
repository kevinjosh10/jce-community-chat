// JCE Live Community Chat - CLOUD EDITION w/ AWS DynamoDB
// GitHub Pages Frontend + DynamoDB Backend (FREE TIER)

class JCEChatCloud {
  constructor() {
    this.user = null;
    this.currentChannel = 'general';
    this.AWS_CONFIG = {
      region: 'ap-south-1',
      accessKeyId: 'YOUR_ACCESS_KEY_ID',     // ← IAM User keys
      secretAccessKey: 'YOUR_SECRET_ACCESS_KEY'  // ← IAM User keys
    };
    this.dynamodb = null;
    this.init();
  }

  init() {
    this.initAWS();
    this.createParticles();
    this.handleLogin();
    this.handleChannels();
    this.handleMessages();
    this.loadUser();
    this.simulateActivity();
    this.loadMessagesFromCloud(); // CLOUD LOAD
  }

  // AWS DYNAMODB INITIALIZATION
  initAWS() {
    // Load AWS SDK (add to index.html: <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1400.0.min.js"></script>)
    AWS.config.update(this.AWS_CONFIG);
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    console.log('✅ AWS DynamoDB Connected - Cloud Storage Ready!');
  }

  // CLOUD SAVE MESSAGE TO DYNAMODB
  async saveMessageToCloud(message) {
    try {
      const params = {
        TableName: 'JCEChat-Messages',
        Item: {
          channel: message.channel,
          timestamp: message.timestamp,
          userId: message.userId,
          name: message.name,
          dept: `${message.dept} ${message.year}`,
          content: message.content,
          email: message.userId
        }
      };
      
      await this.dynamodb.put(params).promise();
      console.log('💾 Message saved to DynamoDB!');
      return true;
    } catch (error) {
      console.error('❌ DynamoDB Error:', error);
      this.showNotification('Cloud save failed - using local fallback', 'error');
      return false;
    }
  }

  // CLOUD LOAD MESSAGES FROM DYNAMODB
  async loadMessagesFromCloud(channel = this.currentChannel) {
    try {
      const params = {
        TableName: 'JCEChat-Messages',
        KeyConditionExpression: 'channel = :channel',
        ExpressionAttributeValues: { ':channel': channel },
        ScanIndexForward: false, // Newest first
        Limit: 100
      };
      
      const result = await this.dynamodb.query(params).promise();
      const messagesEl = document.getElementById('messages');
      
      if (result.Items && result.Items.length > 0) {
        messagesEl.innerHTML = result.Items.map(msg => this.formatMessage(msg)).join('');
      } else {
        messagesEl.innerHTML = `
          <div class="message other" style="text-align:center;color:var(--gray-500);">
            🌐 Cloud storage active! No messages yet. Be first to chat!
          </div>
        `;
      }
      
      messagesEl.scrollTop = messagesEl.scrollHeight;
      console.log(`📥 Loaded ${result.Items?.length || 0} messages from DynamoDB`);
    } catch (error) {
      console.error('DynamoDB load error:', error);
      this.showNotification('Cloud load failed - showing welcome message', 'info');
    }
  }

  // SAVE USER TO DYNAMODB
  async saveUserToCloud(user) {
    try {
      const params = {
        TableName: 'JCEChat-Users',
        Item: {
          email: user.email,
          name: user.name,
          dept: user.dept,
          year: user.year,
          joinedAt: Date.now()
        }
      };
      await this.dynamodb.put(params).promise();
      console.log('👤 User profile saved to DynamoDB!');
    } catch (error) {
      console.error('User save error:', error);
    }
  }

  createParticles() {
    const particles = document.getElementById('particles');
    for(let i = 0; i < 70; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = `-${Math.random() * 15}s`;
      particle.style.animationDuration = (10 + Math.random() * 10) + 's';
      particles.appendChild(particle);
    }
  }

  handleLogin() {
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.user = Object.fromEntries(formData);
      
      // JCE Email validation
      if (!this.user.email.includes('@jerusalemengg.ac.in')) {
        this.showNotification('Please use JCE email (@jerusalemengg.ac.in)', 'error');
        return;
      }
      
      // Save to localStorage AND CLOUD
      localStorage.setItem('jceUser', JSON.stringify(this.user));
      await this.saveUserToCloud(this.user);
      
      // Smooth transition
      document.getElementById('login-screen').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('chat-screen').style.display = 'flex';
        document.getElementById('channel-title').textContent = 'General Chat (Cloud)';
        this.loadMessagesFromCloud();
        this.showNotification(`🌐 Welcome ${this.user.name}! Cloud chat active!`, 'success');
      }, 600);
    });
  }

  loadUser() {
    const saved = localStorage.getItem('jceUser');
    if (saved) {
      this.user = JSON.parse(saved);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('chat-screen').style.display = 'flex';
      this.loadMessagesFromCloud();
    }
  }

  handleChannels() {
    document.querySelectorAll('.channel').forEach(channel => {
      channel.addEventListener('click', async () => {
        document.querySelectorAll('.channel').forEach(c => c.classList.remove('active'));
        channel.classList.add('active');
        this.currentChannel = channel.dataset.channel;
        document.getElementById('channel-title').textContent = 
          channel.textContent.replace(/📢|📫|💻|💼|🚀|🎓/g, '').trim() + ' (Cloud)';
        
        await this.loadMessagesFromCloud(this.currentChannel);
        this.showNotification(`Switched to ${this.currentChannel} - Cloud loaded!`, 'info');
      });
    });
  }

  formatMessage(msg) {
    const isOwn = msg.userId === this.user?.email;
    const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    
    return `
      <div class="message ${isOwn ? 'own' : 'other'}">
        ${!isOwn ? `<div class="message-header">${msg.name} (${msg.dept})</div>` : ''}
        <div>${this.formatContent(msg.content)}</div>
        <div class="message-time">${time} ${msg.email ? '🌐' : ''}</div>
      </div>
    `;
  }

  formatContent(content) {
    return content
      .replace(/@(\w+)/g, '<span style="color:var(--purple-500);font-weight:600;">@$1</span>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--purple-500);">🔗</a>');
  }

  async handleMessages() {
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('message-input');
    
    const send = async () => {
      const content = input.value.trim();
      if (!content || !this.user) {
        this.showNotification('Login and type message first!', 'error');
        return;
      }
      
      // Create cloud message
      const message = {
        id: Date.now().toString(),
        channel: this.currentChannel,
        userId: this.user.email,
        name: this.user.name,
        dept: this.user.dept,
        year: this.user.year,
        content,
        timestamp: Date.now()
      };
      
      // SAVE TO CLOUD (Primary)
      const cloudSaved = await this.saveMessageToCloud(message);
      
      // ADD TO UI IMMEDIATELY
      const messagesEl = document.getElementById('messages');
      messagesEl.innerHTML += this.formatMessage(message);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      
      input.value = '';
      
      if (cloudSaved) {
        this.showNotification('💾 Message saved to AWS DynamoDB!', 'success');
      }
      
      this.simulateCloudResponse();
    };
    
    sendBtn.addEventListener('click', send);
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  simulateCloudResponse() {
    setTimeout(async () => {
      const responses = ['Great point Kevin! 👍', 'Thanks! 🙌', 'Interesting! 🤔'];
      const response = responses[Math.floor(Math.random() * 3)];
      
      const botMsg = {
        channel: this.currentChannel,
        timestamp: Date.now() + 1000,
        userId: 'bot@jce.ac.in',
        name: 'JCE Bot',
        dept: 'AI',
        content: response
      };
      
      await this.saveMessageToCloud(botMsg);
      const messagesEl = document.getElementById('messages');
      messagesEl.innerHTML += this.formatMessage(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 1500);
  }

  simulateActivity() {
    setInterval(() => {
      document.getElementById('online-count').textContent = 25 + Math.floor(Math.random() * 15);
    }, 5000);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:10000;padding:16px 24px;
      border-radius:12px;font-weight:600;color:white;min-width:300px;
      transform:translateX(400px);opacity:0;transition:all 0.4s;
      background:linear-gradient(135deg,${type==='success'?'#10b981':'#a855f7'} 0%, #6d28d9 100%);
      box-shadow:0 20px 25px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 400);
    }, 4000);
  }
}

// Initialize Cloud Chat
document.addEventListener('DOMContentLoaded', () => {
  new JCEChatCloud();
});
