/**
 * Social Media Dashboard Functions
 */

const API_URL = 'https://api.travelsmarterapp.com';

// Load social media status when tab is clicked
async function loadSocialMediaDashboard() {
  console.log('Loading social media dashboard...');
  await loadPlatformStatus();
  await loadConnectedAccounts();
  await loadRecentPosts();
  setupCharacterCounter();
}

/**
 * Load platform status
 */
async function loadPlatformStatus() {
  try {
    const response = await fetch(`${API_URL}/api/social/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      const statusHTML = Object.entries(data.status).map(([platform, status]) => `
        <div class="card">
          <h3>${getPlatformEmoji(platform)} ${capitalize(platform)}</h3>
          <div style="font-size: 2em; margin: 10px 0;">
            ${status.connected ? '✅' : '❌'}
          </div>
          <p>${status.connected ? 'Connected' : 'Not connected'}</p>
          <p style="font-size: 0.9em; color: #6b7280;">
            ${status.accounts} account(s) configured
          </p>
        </div>
      `).join('');

      document.getElementById('platform-status').innerHTML = statusHTML;
    }
  } catch (error) {
    console.error('Error loading platform status:', error);
  }
}

/**
 * Load connected accounts
 */
async function loadConnectedAccounts() {
  try {
    const response = await fetch(`${API_URL}/api/social/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && data.accounts.length > 0) {
      const accountsHTML = data.accounts.map(account => `
        <div style="
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        ">
          <div>
            <strong>${getPlatformEmoji(account.platform)} ${account.account_name}</strong>
            <p style="font-size: 0.9em; color: #6b7280; margin: 4px 0;">
              ${account.platform} • ${account.is_active ? '✅ Active' : '⏸️ Inactive'}
            </p>
          </div>
          <button onclick="disconnectAccount('${account.id}')" class="btn btn-danger btn-sm">
            Disconnect
          </button>
        </div>
      `).join('');

      document.getElementById('accounts-list').innerHTML = accountsHTML;
    } else {
      document.getElementById('accounts-list').innerHTML = '<p style="color: #6b7280;">No accounts connected yet</p>';
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

/**
 * Load recent posts
 */
async function loadRecentPosts() {
  try {
    const response = await fetch(`${API_URL}/api/social/posts?limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && data.posts.length > 0) {
      const postsHTML = data.posts.map(post => `
        <tr>
          <td>${new Date(post.created_at).toLocaleDateString()}</td>
          <td><span class="badge badge-info">${post.post_type}</span></td>
          <td>${post.content.substring(0, 50)}...</td>
          <td>-</td>
          <td><span class="badge badge-success">Posted</span></td>
        </tr>
      `).join('');

      document.getElementById('posts-tbody').innerHTML = postsHTML;
    } else {
      document.getElementById('posts-tbody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No posts yet</td></tr>';
    }
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

/**
 * Publish post to selected platforms
 */
async function publishPost() {
  try {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const postType = document.getElementById('post-type').value;
    const imageUrl = document.getElementById('post-image').value;

    // Get selected platforms
    const platformCheckboxes = document.querySelectorAll('input[name="platforms"]:checked');
    const platforms = Array.from(platformCheckboxes).map(cb => cb.value);

    if (!content.trim()) {
      alert('Please enter post content');
      return;
    }

    if (platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    // Create post
    const createResponse = await fetch(`${API_URL}/api/social/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,
        post_type: postType,
        image_url: imageUrl || null,
        platforms
      })
    });

    const createData = await createResponse.json();

    if (!createData.success) {
      alert('Error creating post: ' + createData.message);
      return;
    }

    const postId = createData.postId;

    // Publish post to platforms
    const publishResponse = await fetch(`${API_URL}/api/social/posts/${postId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platforms,
        accountIds: {}
      })
    });

    const publishData = await publishResponse.json();

    // Show results
    const successful = publishData.results.filter(r => r.success).length;
    const failed = publishData.results.filter(r => !r.success).length;

    let message = `✅ Posted to ${successful} platform(s)`;
    if (failed > 0) {
      message += ` (⚠️ ${failed} failed)`;
    }

    alert(message);

    // Clear form
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-image').value = '';
    document.querySelectorAll('input[name="platforms"]').forEach(cb => cb.checked = false);

    // Reload posts
    await loadRecentPosts();
  } catch (error) {
    console.error('Error publishing post:', error);
    alert('Error: ' + error.message);
  }
}

/**
 * Open connect account modal
 */
function openConnectModal() {
  document.getElementById('connect-modal').classList.add('active');
}

/**
 * Close connect account modal
 */
function closeConnectModal() {
  document.getElementById('connect-modal').classList.remove('active');
}

/**
 * Connect new account
 */
async function connectAccount() {
  try {
    const platform = document.getElementById('connect-platform').value;
    const accountName = document.getElementById('connect-account-name').value;
    const token = document.getElementById('connect-token').value;

    if (!platform || !accountName || !token) {
      alert('Please fill in all required fields');
      return;
    }

    const response = await fetch(`${API_URL}/api/social/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform,
        account_name: accountName,
        access_token: token
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Account connected successfully!');
      closeConnectModal();
      document.getElementById('connect-platform').value = '';
      document.getElementById('connect-account-name').value = '';
      document.getElementById('connect-token').value = '';
      await loadConnectedAccounts();
      await loadPlatformStatus();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error connecting account:', error);
    alert('Error: ' + error.message);
  }
}

/**
 * Disconnect account
 */
async function disconnectAccount(accountId) {
  if (!confirm('Are you sure you want to disconnect this account?')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/social/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Account disconnected');
      await loadConnectedAccounts();
      await loadPlatformStatus();
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error disconnecting account:', error);
  }
}

/**
 * Save platform configuration
 */
async function savePlatformConfig(platform) {
  try {
    const frequency = document.getElementById(`${platform}-frequency`).value;

    const response = await fetch(`${API_URL}/api/social/config/${platform}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        posting_frequency: frequency
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${platform} config saved`);
    }
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

/**
 * Setup character counter
 */
function setupCharacterCounter() {
  const contentArea = document.getElementById('post-content');
  const charCount = document.getElementById('char-count');

  contentArea.addEventListener('input', () => {
    const count = contentArea.value.length;
    charCount.textContent = `${count}/280 characters`;

    if (count > 280) {
      charCount.style.color = '#ef4444';
    } else {
      charCount.style.color = '#6b7280';
    }
  });
}

/**
 * Helper: Get platform emoji
 */
function getPlatformEmoji(platform) {
  const emojis = {
    twitter: '🐦',
    reddit: '🤖',
    pinterest: '📌',
    instagram: '📸',
    linkedin: '💼'
  };
  return emojis[platform] || '📱';
}

/**
 * Helper: Capitalize string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
