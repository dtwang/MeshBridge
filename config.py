LOCAL_APP = "noteboard"


SEND_INTERVAL_SECOND = 30
ACK_TIMEOUT_SECONDS = 60

# 單一頻道設定（舊版格式，不再使用，可直接使用新版格式的頻道設定）
# BOARD_MESSAGE_CHANEL_NAME = "MQBoardTest"
# MAX_NOTE_SHOW = 200
# MAX_ARCHIVED_NOTE_SHOW = 200
# NOTEBOARD_ADMIN_PASSCODE = "667788"
# NOTEBOARD_POST_PASSCODE = "1234"

# 多頻道設定（新功能）
# 格式：[{"name": "頻道名稱", "user_passcode": "進入密碼", "admin_passcode": "管理密碼", "post_passcode": "發文密碼", "max_notes": 數量 , "max_archived_notes": 數量}, ...]
# 每個頻道可設定獨立的密碼與顯示數量

BOARD_MESSAGE_CHANNELS = [
    {
        "name": "MQBoardTest",
        "user_passcode": "", "admin_passcode": "667788", "post_passcode": "",
        "max_notes": 200, "max_archived_notes": 200
    },
    {
        "name": "TeamAlpha",
        "user_passcode": "1234", "admin_passcode": "998877", "post_passcode": "5678",
        "max_notes": 200, "max_archived_notes": 200
    }
]