import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const HISTORY_LIMIT = 200
const STORAGE_KEY = 'mesh_noteboard_history'

function generatePastelColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return {
    bg: `hsl(${h}, 70%, 85%)`,
    text: '#333'
  }
}

function App() {
  const [socket, setSocket] = useState(null)
  const [notes, setNotes] = useState([])
  const [nickname, setNickname] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [loraOnline, setLoraOnline] = useState(false)
  const [myUUID, setMyUUID] = useState('')

  useEffect(() => {
    let uuid = localStorage.getItem('mesh_user_id')
    if (!uuid) {
      uuid = 'user-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36)
      localStorage.setItem('mesh_user_id', uuid)
    }
    setMyUUID(uuid)

    const savedNick = localStorage.getItem('mesh_nickname')
    if (savedNick) {
      setNickname(savedNick)
    }

    const history = loadHistory()
    setNotes(history)

    const newSocket = io()
    setSocket(newSocket)

    newSocket.on('lora_status', (data) => {
      setLoraOnline(data.online)
    })

    newSocket.on('new_message', (data) => {
      saveToHistory(data)
      setNotes(prev => [...prev, data])
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const loadHistory = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        return []
      }
    }
    return []
  }

  const saveToHistory = (msgData) => {
    let history = loadHistory()
    history.push(msgData)
    if (history.length > HISTORY_LIMIT) {
      history.shift()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  }

  const handleNicknameChange = (e) => {
    const value = e.target.value
    setNickname(value)
    localStorage.setItem('mesh_nickname', value)
  }

  const addNote = () => {
    const text = noteInput.trim()
    const nick = nickname.trim()
    
    if (!nick) {
      alert("請先輸入暱稱！")
      return
    }
    if (!text) return

    socket.emit('send_mesh', {
      text: text,
      sender: nick,
      userId: myUUID
    })
    
    setNoteInput('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addNote()
    }
  }

  const deleteNote = (index) => {
    const newNotes = notes.filter((_, i) => i !== index)
    setNotes(newNotes)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes))
  }

  const renderNote = (data, index) => {
    const senderName = data.sender || 'Unknown'
    const senderID = data.userId || 'unknown-id'
    const text = data.text
    const time = data.time || ''
    const loraSuccess = data.loraSuccess !== undefined ? data.loraSuccess : true

    const colorStyle = generatePastelColor(senderID)
    const isMyNote = senderID === myUUID

    return (
      <div 
        key={index} 
        className={`sticky-note ${!loraSuccess ? 'note-failed' : ''}`}
        style={{
          backgroundColor: colorStyle.bg,
          color: colorStyle.text
        }}
      >
        <div className="note-header">
          <span className="note-author">{senderName}</span>
          {isMyNote && (
            <button 
              className="delete-btn"
              onClick={() => deleteNote(index)}
              title="刪除便條"
            >
              ×
            </button>
          )}
        </div>
        <div className="note-content">{text}</div>
        <div className="note-footer">
          <span className="note-time">{time}</span>
          {!loraSuccess && <span className="note-status">⚠️ WiFi</span>}
        </div>
      </div>
    )
  }

  return (
    <>
      <header>
        <div className="header-left">
          <div className="app-name">MeshBridge</div>
          <div className="app-link">noteboard.meshbridge.com</div>
        </div>
        
        <div className="status-container">
          <div className={`status-dot ${loraOnline ? 'online' : ''}`}></div>
          <div className="status-text">
            {loraOnline ? 'LoRa 連線' : 'LoRa 斷線'}
          </div>
        </div>
      </header>

      <div className="noteboard-container">
        <div className="notes-grid">
          {notes.map((note, idx) => renderNote(note, idx))}
        </div>
      </div>

      <div className="input-area">
        <input
          type="text"
          className="nickname-input"
          placeholder="暱稱"
          maxLength="8"
          value={nickname}
          onChange={handleNicknameChange}
        />
        <textarea
          className="note-input"
          placeholder="輸入便條內容... (Enter 送出，Shift+Enter 換行)"
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows="3"
        />
        <button className="add-btn" onClick={addNote}>新增便條</button>
      </div>
    </>
  )
}

export default App
