import { useState, useEffect } from 'react'
import { Plus, Star, Trash2, Check, Calendar, Tag, Wifi, WifiOff, Edit2, X, DollarSign, Link as LinkIcon } from 'lucide-react'
import { useFirebaseWishes } from './hooks/useFirebaseWishes'
import './App.css'

function App() {
  const {
    wishes,
    loading,
    error,
    addWish: addWishToFirebase,
    updateWish,
    toggleComplete,
    togglePriority,
    deleteWish
  } = useFirebaseWishes()

  const [filter, setFilter] = useState('all')
  const [currentSection, setCurrentSection] = useState('wishlist')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    price: '',
    url: '',
    emoji: '🎁',
    addedBy: 'both'
  })

  // Initialize floating hearts
  useEffect(() => {
    const heartBg = document.getElementById('heartBg')
    if (!heartBg) return
    
    const hearts = ['💕', '💖', '💗', '💓', '💝', '🌻', '🌸', '🌺']
    heartBg.innerHTML = ''
    
    for (let i = 0; i < 15; i++) {
      const heart = document.createElement('div')
      heart.className = 'floating-heart'
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)]
      heart.style.left = `${Math.random() * 100}%`
      heart.style.animationDelay = `${Math.random() * 10}s`
      heart.style.animationDuration = `${8 + Math.random() * 4}s`
      heartBg.appendChild(heart)
    }
  }, [])

  // Parse wish data to extract emoji, addedBy, price, url, and actual text
  const parseWishData = (wish) => {
    let emoji = '🎁'
    let addedBy = 'both'
    let price = ''
    let url = ''
    let displayText = wish.text || ''
    
    // Check if text contains metadata
    if (displayText.includes('EMOJI:')) {
      const parts = displayText.split('|')
      
      // Extract emoji
      if (parts[0]) {
        emoji = parts[0].replace('EMOJI:', '').trim()
      }
      
      // Extract addedBy
      if (parts[1] && parts[1].includes('ADDEDBY:')) {
        addedBy = parts[1].replace('ADDEDBY:', '').trim()
      }
      
      // Extract price
      if (parts[2] && parts[2].includes('PRICE:')) {
        price = parts[2].replace('PRICE:', '').trim()
      }
      
      // Extract url
      if (parts[3] && parts[3].includes('URL:')) {
        url = parts[3].replace('URL:', '').trim()
      }
      
      // Extract actual text/description
      if (parts.length > 4) {
        displayText = parts.slice(4).join('|').trim()
      } else if (parts.length === 4 && !parts[3].includes('URL:')) {
        displayText = parts[3].trim()
      }
    }
    
    return {
      ...wish,
      emoji,
      addedBy,
      price,
      url,
      displayText,
      originalText: wish.text
    }
  }

  // Filter wishes by section
  const allParsedWishes = wishes.map(parseWishData)
  
  const wishlistItems = allParsedWishes.filter(wish => 
    !wish.category?.toLowerCase().includes('thought') && 
    !wish.category?.toLowerCase().includes('dream')
  )
  
  const thoughts = allParsedWishes.filter(wish => 
    wish.category?.toLowerCase().includes('thought')
  )
  
  const dreams = allParsedWishes.filter(wish => 
    wish.category?.toLowerCase().includes('dream')
  )

  // Current section items
  const currentItems = currentSection === 'wishlist' ? wishlistItems :
                       currentSection === 'thoughts' ? thoughts : dreams

  const filteredWishes = currentItems.filter(wish => {
    if (filter === 'completed') return wish.completed
    if (filter === 'pending') return !wish.completed
    if (filter === 'priority') return wish.priority
    return true
  })

  const categories = [...new Set(currentItems.map(wish => wish.category))]

  // Get added by badge
  const getAddedByBadge = (addedBy) => {
    const badges = {
      'shivesh': { emoji: '🐻', text: 'Shivesh dudu', color: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)' },
      'deepika': { emoji: '🦄', text: 'Deepika bubu', color: 'linear-gradient(135deg, #F3E5F5, #E1BEE7)' },
      'both': { emoji: '💕', text: 'Both', color: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)' }
    }
    
    const badge = badges[addedBy] || badges['both']
    return badge
  }

  const openModal = (section = null) => {
    const targetSection = section || currentSection
    setEditingId(null)
    
    if (targetSection === 'thoughts') {
      setFormData({
        title: '',
        description: '',
        category: 'love-thought',
        priority: 'medium',
        price: '',
        url: '',
        emoji: '💭',
        addedBy: 'both'
      })
    } else if (targetSection === 'dreams') {
      setFormData({
        title: '',
        description: '',
        category: 'future-dream',
        priority: 'medium',
        price: '',
        url: '',
        emoji: '🌟',
        addedBy: 'both'
      })
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        price: '',
        url: '',
        emoji: '🎁',
        addedBy: 'both'
      })
    }
    
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      price: '',
      url: '',
      emoji: '🎁',
      addedBy: 'both'
    })
  }

  const handleEdit = (wish) => {
    setEditingId(wish.id)
    
    const parsed = parseWishData(wish)
    
    setFormData({
      title: parsed.displayText || '',
      description: parsed.displayText || '',
      category: wish.category || 'personal',
      priority: wish.priority ? 'high' : 'medium',
      price: parsed.price || '',
      url: parsed.url || '',
      emoji: parsed.emoji,
      addedBy: parsed.addedBy
    })
    
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim()) return
    
    // Prepare the text with metadata
    let finalText = formData.title.trim()
    let finalCategory = formData.category
    
    // Encode metadata in the text
    const priceStr = formData.price ? formData.price : ''
    const urlStr = formData.url ? formData.url : ''
    
    finalText = `EMOJI:${formData.emoji}|ADDEDBY:${formData.addedBy}|PRICE:${priceStr}|URL:${urlStr}|${formData.title.trim()}`
    
    if (editingId) {
      await updateWish(editingId, {
        text: finalText,
        category: finalCategory,
        priority: formData.priority === 'high'
      })
    } else {
      await addWishToFirebase(finalText, finalCategory)
    }
    
    closeModal()
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="app">
      <div className="heart-bg" id="heartBg"></div>
      
      <div className="container">
        <header className="header">
          <h1 className="title">
            <Star className="title-icon" />
            Shivesh & Deepika's Love Wishlist
          </h1>
          <p className="subtitle">We'll always achieve whatever we wish for💕</p>

          <div className="sync-status">
            {loading ? (
              <div className="status-indicator loading">
                <div className="spinner"></div>
                <span>Connecting to cloud...</span>
              </div>
            ) : error ? (
              <div className="status-indicator offline">
                <WifiOff size={16} />
                <span>Offline mode - {error}</span>
              </div>
            ) : (
              <div className="status-indicator online">
                <Wifi size={16} />
                <span>Live sync active - changes appear instantly!</span>
              </div>
            )}
          </div>
        </header>

        <div className="section-tabs">
          <button 
            className={`tab-btn ${currentSection === 'wishlist' ? 'active' : ''}`}
            onClick={() => setCurrentSection('wishlist')}
          >
            🎁 Wishlist ({wishlistItems.length})
          </button>
          <button 
            className={`tab-btn ${currentSection === 'thoughts' ? 'active' : ''}`}
            onClick={() => setCurrentSection('thoughts')}
          >
            💭 Love Thoughts ({thoughts.length})
          </button>
          <button 
            className={`tab-btn ${currentSection === 'dreams' ? 'active' : ''}`}
            onClick={() => setCurrentSection('dreams')}
          >
            🌟 Future Dreams ({dreams.length})
          </button>
        </div>

        <div className="add-section">
          <button onClick={() => openModal()} className="add-button-main" disabled={loading}>
            <Plus size={24} />
            Add {currentSection === 'wishlist' ? 'Wish' : currentSection === 'thoughts' ? 'Love Thought' : 'Future Dream'}
          </button>
        </div>

        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({currentItems.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({currentItems.filter(w => !w.completed).length})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({currentItems.filter(w => w.completed).length})
          </button>
          <button
            className={`filter-btn ${filter === 'priority' ? 'active' : ''}`}
            onClick={() => setFilter('priority')}
          >
            Priority ({currentItems.filter(w => w.priority).length})
          </button>
        </div>

        <div className="wishes-container">
          {filteredWishes.length === 0 ? (
            <div className="empty-state">
              <Star size={48} className="empty-icon" />
              <h3>No {currentSection === 'wishlist' ? 'wishes' : currentSection} yet!</h3>
              <p>Click the button above to add your first {currentSection === 'wishlist' ? 'dream or goal' : currentSection === 'thoughts' ? 'loving thought' : 'future dream'}!</p>
            </div>
          ) : (
            <div className="wishes-grid">
              {filteredWishes.map(wish => {
                const badge = getAddedByBadge(wish.addedBy)
                return (
                  <div key={wish.id} className={`wish-card ${wish.completed ? 'completed' : ''} ${wish.priority ? 'priority' : ''}`}>
                    <div className="wish-header">
                      <div className="wish-category">
                        <Tag size={14} />
                        {wish.category}
                      </div>
                      <div className="wish-actions">
                        <button
                          onClick={() => handleEdit(wish)}
                          className="edit-btn"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => togglePriority(wish.id)}
                          className={`priority-btn ${wish.priority ? 'active' : ''}`}
                          title="Toggle Priority"
                        >
                          <Star size={16} />
                        </button>
                        <button
                          onClick={() => toggleComplete(wish.id)}
                          className={`complete-btn ${wish.completed ? 'active' : ''}`}
                          title="Toggle Complete"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this?')) {
                              deleteWish(wish.id)
                            }
                          }}
                          className="delete-btn"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="wish-content">
                      <div className="wish-emoji-text">
                        <span className="wish-emoji">{wish.emoji}</span>
                        <p className="wish-text">{wish.displayText}</p>
                      </div>
                      
                      {/* Price and URL section */}
                      {(wish.price || wish.url) && (
                        <div className="wish-meta">
                          {wish.price && (
                            <div className="wish-price">
                              <DollarSign size={14} />
                              <span>{wish.price}</span>
                            </div>
                          )}
                          {wish.url && (
                            <a 
                              href={wish.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="wish-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon size={14} />
                              <span>View Link</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      <div className="wish-footer">
                        <span 
                          className="added-by-badge" 
                          style={{ background: badge.color }}
                        >
                          {badge.emoji} {badge.text}
                        </span>
                        <div className="wish-date">
                          <Calendar size={12} />
                          {wish.createdAt}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="categories-section">
            <h3>Categories</h3>
            <div className="categories-list">
              {categories.map(category => (
                <span key={category} className="category-tag">
                  {category} ({currentItems.filter(w => w.category === category).length})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingId ? '✏️ Edit' : '✨ Add'} {
                  currentSection === 'wishlist' ? 'Wishlist Item' :
                  currentSection === 'thoughts' ? 'Love Thought' :
                  'Future Dream'
                }
              </h2>
              <button onClick={closeModal} className="close-btn">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Emoji Picker */}
              <div className="form-group">
                <label>Choose an Emoji 😊</label>
                <div className="emoji-picker">
                  {['🎁', '💕', '🌻', '💍', '🏠', '✈️', '🎮', '📱', '💻', '🎨', '📚', '🎵', '🌸', '🍰', '☕', '🌙'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn ${formData.emoji === emoji ? 'selected' : ''}`}
                      onClick={() => handleChange('emoji', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label>
                  {currentSection === 'wishlist' ? 'Title' : 
                   currentSection === 'thoughts' ? 'Thought Title' : 'Dream Title'} 
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={currentSection === 'wishlist' ? "What do you wish for?" : 
                              currentSection === 'thoughts' ? "A sweet message..." : 
                              "What's your dream?"}
                  required
                />
              </div>

              {/* Description - Only for thoughts and dreams */}
              {(currentSection === 'thoughts' || currentSection === 'dreams') && (
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Add more details..."
                    rows="3"
                  />
                </div>
              )}

              <div className="form-row">
                {/* Category */}
                <div className="form-group">
                  <label>Category <span className="required">*</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    required
                  >
                    {currentSection === 'wishlist' && (
                      <>
                        <option value="personal">🎁 Personal</option>
                        <option value="together">👫 Together</option>
                        <option value="home">🏠 Home</option>
                        <option value="travel">✈️ Travel</option>
                        <option value="tech">💻 Tech</option>
                        <option value="fashion">👗 Fashion</option>
                        <option value="food">🍕 Food</option>
                        <option value="hobby">🎨 Hobby</option>
                      </>
                    )}
                    {currentSection === 'thoughts' && (
                      <>
                        <option value="love-thought">💕 Love Thought</option>
                        <option value="appreciation">🌟 Appreciation</option>
                        <option value="memory">🎞️ Memory</option>
                      </>
                    )}
                    {currentSection === 'dreams' && (
                      <>
                        <option value="future-dream">🌟 Future Dream</option>
                        <option value="travel-dream">✈️ Travel</option>
                        <option value="home-dream">🏠 Home</option>
                        <option value="career-dream">💼 Career</option>
                        <option value="family-dream">👨‍👩‍👧 Family</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label>Priority <span className="required">*</span></label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    required
                  >
                    <option value="high">❤️ High</option>
                    <option value="medium">💛 Medium</option>
                    <option value="low">💙 Low</option>
                  </select>
                </div>

                {/* Added By */}
                <div className="form-group">
                  <label>Added By <span className="required">*</span></label>
                  <select
                    value={formData.addedBy}
                    onChange={(e) => handleChange('addedBy', e.target.value)}
                    required
                  >
                    <option value="shivesh">🐻 Shivesh</option>
                    <option value="deepika">🦄 Deepika</option>
                    <option value="both">💕 Both</option>
                  </select>
                </div>
              </div>

              {/* Price and URL - For all sections */}
              <div className="form-row">
                <div className="form-group">
                  <label>Price 💰</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="₹ 0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Link 🔗</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-actions">
                <button type="submit" className="btn-submit">
                  💕 {editingId ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={closeModal} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App