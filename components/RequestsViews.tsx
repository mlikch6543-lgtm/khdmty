
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { User, ClassGroup, RequestMessage, UserRole, Sector } from '../types';
import { Avatar } from './Avatar';
import { Send, MessageCircle, User as UserIcon, BookOpen, Clock, ChevronLeft, Search, Check, CheckCheck, Church, ChevronDown, X, Copy, Edit2, Trash2, Smile, MoreVertical, AlertTriangle } from 'lucide-react';
import { updateData, deleteData } from '../services/firebase';

// --- Shared Components ---

interface ChatWindowProps {
  messages: RequestMessage[];
  currentUser: User;
  targetUser: User; // The person we are talking to
  targetClass: ClassGroup; // The context
  onSendMessage: (text: string) => void;
  onBack?: () => void;
  isLoading?: boolean;
  threadId: string; // Add threadId to enable updates
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  currentUser, 
  targetUser,
  targetClass,
  onSendMessage, 
  onBack,
  isLoading,
  threadId
}) => {
  const [inputText, setInputText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: RequestMessage } | null>(null);
  const [editingMessage, setEditingMessage] = useState<RequestMessage | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<RequestMessage | null>(null);
  const [reactionRemoveConfirm, setReactionRemoveConfirm] = useState<{ messageId: string, emoji: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // --- Scroll Logic ---
  useLayoutEffect(() => {
    // If it's the first load, jump to bottom immediately without animation
    if (isFirstLoad.current && messages.length > 0 && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        isFirstLoad.current = false;
        return;
    }

    // Smart Scroll: Only scroll if we were already near the bottom OR if the last message is from me
    if (scrollContainerRef.current && messages.length > 0) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        const lastMessage = messages[messages.length - 1];
        const isMyMessage = lastMessage.senderId === currentUser.id;

        if (isNearBottom || isMyMessage) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [messages, currentUser.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    if (editingMessage) {
        // Handle Edit
        updateData(`requests/${threadId}/${editingMessage.id}`, { 
            text: inputText, 
            isEdited: true 
        });
        setEditingMessage(null);
    } else {
        // Handle New Message
        onSendMessage(inputText);
    }
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Context Menu Handlers ---

  const handleContextMenu = (e: React.MouseEvent, msg: RequestMessage) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleTouchStart = (msg: RequestMessage, e: React.TouchEvent) => {
      // e.persist(); // Not strictly needed in React 18+ but good for safety if using old React
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      
      longPressTimer.current = setTimeout(() => {
          setContextMenu({ x, y, message: msg });
      }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const closeContextMenu = () => setContextMenu(null);

  // --- Actions ---

  const handleCopy = () => {
      if (contextMenu) {
          navigator.clipboard.writeText(contextMenu.message.text);
          closeContextMenu();
      }
  };

  const handleEditInit = () => {
      if (contextMenu) {
          setEditingMessage(contextMenu.message);
          setInputText(contextMenu.message.text);
          closeContextMenu();
      }
  };

  const handleCancelEdit = () => {
      setEditingMessage(null);
      setInputText('');
  };

  const handleDeleteInit = () => {
      if (contextMenu) {
          setDeleteConfirmation(contextMenu.message);
          closeContextMenu();
      }
  };

  const handleConfirmDelete = () => {
      if (deleteConfirmation) {
          deleteData(`requests/${threadId}/${deleteConfirmation.id}`);
          setDeleteConfirmation(null);
      }
  };

  // Reaction Logic
  const handleReaction = (emoji: string, msg: RequestMessage = contextMenu!.message) => {
      const currentReactions = msg.reactions || {};
      
      // Check if trying to remove existing reaction
      if (currentReactions[currentUser.id] === emoji) {
          // If called from Context Menu, toggle off immediately
          if (contextMenu) {
              const updatedReactions = { ...currentReactions };
              delete updatedReactions[currentUser.id];
              updateData(`requests/${threadId}/${msg.id}`, { reactions: updatedReactions });
          } else {
              // Trigger confirmation if not from context menu
              setReactionRemoveConfirm({ messageId: msg.id, emoji });
          }
      } else {
          // Add/Update Reaction
          updateData(`requests/${threadId}/${msg.id}/reactions`, { 
              ...currentReactions, 
              [currentUser.id]: emoji 
          });
      }
      if (contextMenu) closeContextMenu();
  };

  const handleBubbleClick = (msg: RequestMessage, emoji: string) => {
      const currentReactions = msg.reactions || {};
      if (currentReactions[currentUser.id] === emoji) {
          // User already reacted with this -> Confirm Removal
          setReactionRemoveConfirm({ messageId: msg.id, emoji });
      } else {
          // User hasn't reacted with this -> Add it
          handleReaction(emoji, msg);
      }
  };

  const confirmRemoveReaction = () => {
      if (reactionRemoveConfirm) {
          const { messageId, emoji } = reactionRemoveConfirm;
          // Find current reactions for this message to safely delete
          const msg = messages.find(m => m.id === messageId);
          if (msg && msg.reactions) {
              const updatedReactions = { ...msg.reactions };
              delete updatedReactions[currentUser.id];
              updateData(`requests/${threadId}/${messageId}`, { reactions: updatedReactions });
          }
          setReactionRemoveConfirm(null);
      }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const getRoleLabel = (role: UserRole) => {
      if (role === UserRole.ADMIN) return 'أمين الخدمة';
      if (role === UserRole.SECTOR_SECRETARY) return 'أمين قطاع';
      return 'خادم';
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: RequestMessage[] }[] = [];
    messages.forEach(msg => {
      const dateKey = formatDate(msg.timestamp);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.msgs.push(msg);
      } else {
        groups.push({ date: dateKey, msgs: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Determine permissions for the selected message in context menu
  const isMessageSender = contextMenu?.message.senderId === currentUser.id;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const canEdit = isMessageSender;
  const canDelete = isMessageSender || isAdmin;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[650px] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in w-full relative">
      {/* Header */}
      <div className="p-4 bg-gray-50/80 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3 shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-gray-600 dark:text-gray-300">
            <ChevronLeft size={24} className="rotate-180" />
          </button>
        )}
        <div className="relative">
            <Avatar src={targetUser.avatarUrl} name={targetUser.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-slate-600" />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800"></div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{targetUser.name}</h3>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium flex items-center gap-1">
            <BookOpen size={10} />
            {targetClass.name}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900/30 custom-scrollbar scroll-smooth"
        ref={scrollContainerRef}
      >
        {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
                <div className="animate-pulse flex flex-col items-center">
                   <div className="h-2 w-24 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                   <div className="h-2 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-4">
            <MessageCircle size={48} className="mb-3 opacity-20" />
            <p className="font-bold">لا توجد رسائل سابقة</p>
            <p className="text-xs mt-1">ابدأ المحادثة الآن</p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              <div className="flex justify-center sticky top-0 z-10 my-2">
                <span className="text-[10px] font-bold bg-gray-200/80 dark:bg-slate-700/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>
              {group.msgs.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                // Process Reactions
                const reactions = msg.reactions || {};
                const reactionCounts: Record<string, number> = {};
                Object.values(reactions).forEach((emoji: unknown) => {
                    const e = emoji as string;
                    reactionCounts[e] = (reactionCounts[e] || 0) + 1;
                });
                const hasReactions = Object.keys(reactionCounts).length > 0;

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-fade-in-up relative mb-2`}>
                     {/* Sender Name & Role Label */}
                     <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                            {msg.senderName}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                            msg.senderRole === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            msg.senderRole === UserRole.SECTOR_SECRETARY ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                        }`}>
                            {getRoleLabel(msg.senderRole)}
                        </span>
                     </div>

                     <div 
                       className={`relative max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm cursor-pointer select-none transition-transform active:scale-95 ${
                         isMe 
                           ? 'bg-indigo-600 text-white rounded-tr-none' 
                           : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-slate-600'
                       } ${contextMenu?.message.id === msg.id ? 'ring-2 ring-yellow-400' : ''}`}
                       onContextMenu={(e) => handleContextMenu(e, msg)}
                       onTouchStart={(e) => handleTouchStart(msg, e)}
                       onTouchEnd={handleTouchEnd}
                       onTouchMove={handleTouchEnd} // Cancel on scroll
                     >
                       {msg.text}
                       
                       <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {msg.isEdited && <span className="text-[9px] italic opacity-80">معدلة</span>}
                          <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                          {isMe && (
                              msg.isRead ? <CheckCheck size={12} /> : <Check size={12} />
                          )}
                       </div>

                       {/* Reactions Bubble */}
                       {hasReactions && (
                           <div className={`absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'} flex gap-1 z-10`}>
                               {Object.entries(reactionCounts).map(([emoji, count]) => {
                                   const isMyReaction = msg.reactions?.[currentUser.id] === emoji;
                                   return (
                                       <button 
                                           key={emoji} 
                                           onClick={(e) => { e.stopPropagation(); handleBubbleClick(msg, emoji); }}
                                           className={`border ${isMyReaction ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/50 dark:border-indigo-700' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-600'} rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center gap-0.5 hover:scale-110 transition-transform`}
                                       >
                                           {emoji} <span className="font-bold text-gray-600 dark:text-gray-300">{count > 1 ? count : ''}</span>
                                       </button>
                                   );
                               })}
                           </div>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 shrink-0 z-20">
        {editingMessage && (
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-t-lg border-b border-indigo-100 dark:border-indigo-800/50 mb-2 animate-fade-in">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    <Edit2 size={14} />
                    <span>جاري تعديل الرسالة...</span>
                </div>
                <button onClick={handleCancelEdit} className="text-gray-500 hover:text-red-500"><X size={14} /></button>
            </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? "عدل رسالتك..." : "اكتب رسالتك هنا..."}
            className="flex-1 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none max-h-32 text-sm"
            rows={1}
            style={{ minHeight: '44px' }} 
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`p-3 rounded-xl transition-all disabled:opacity-50 shadow-md mb-0.5 text-white ${editingMessage ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {editingMessage ? <Check size={18} /> : <Send size={18} className={inputText.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />}
          </button>
        </div>
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
          <div className="fixed inset-0 z-50 flex" onClick={closeContextMenu}>
              <div 
                  className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-2 min-w-[180px] animate-fade-in-up"
                  style={{ 
                      top: Math.min(contextMenu.y, window.innerHeight - 250), // Prevent overflow bottom
                      left: contextMenu.message.senderId === currentUser.id 
                            ? Math.max(10, contextMenu.x - 180) // Align left for my messages
                            : Math.min(window.innerWidth - 190, contextMenu.x) // Align right for others
                  }}
                  onClick={e => e.stopPropagation()}
              >
                  {/* Reactions Row */}
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-700/50 rounded-xl p-2 mb-2">
                      {reactionOptions.map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(emoji)}
                            className={`hover:scale-125 transition-transform text-lg p-1 rounded-full ${
                                contextMenu.message.reactions?.[currentUser.id] === emoji ? 'bg-indigo-100 dark:bg-indigo-900/50' : ''
                            }`}
                          >
                              {emoji}
                          </button>
                      ))}
                  </div>

                  {/* Actions List */}
                  <div className="flex flex-col gap-1">
                      <button onClick={handleCopy} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg w-full text-right transition-colors">
                          <Copy size={16} className="text-gray-400" />
                          نسخ النص
                      </button>
                      
                      {canEdit && (
                        <button onClick={handleEditInit} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg w-full text-right transition-colors">
                            <Edit2 size={16} className="text-blue-500" />
                            تعديل
                        </button>
                      )}

                      {canDelete && (
                        <button onClick={handleDeleteInit} className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full text-right transition-colors">
                            <Trash2 size={16} />
                            حذف
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fade-in-up">
                  <div className="flex items-center gap-3 text-red-600 mb-3">
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full">
                          <AlertTriangle size={24} />
                      </div>
                      <h3 className="font-bold text-lg dark:text-white">حذف الرسالة؟</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                      هل أنت متأكد من حذف هذه الرسالة؟ سيتم إزالتها لدى الطرفين.
                  </p>
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setDeleteConfirmation(null)}
                        className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold"
                      >
                          إلغاء
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold shadow-lg shadow-red-200 dark:shadow-none"
                      >
                          نعم، حذف
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Reaction Removal Confirmation Dialog */}
      {reactionRemoveConfirm && (
          <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fade-in-up">
                  <div className="flex items-center gap-3 text-indigo-600 mb-3">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-full">
                          <Smile size={24} />
                      </div>
                      <h3 className="font-bold text-lg dark:text-white">إزالة التفاعل؟</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                      هل تريد إزالة تفاعلك ({reactionRemoveConfirm.emoji}) من هذه الرسالة؟
                  </p>
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setReactionRemoveConfirm(null)}
                        className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold"
                      >
                          إلغاء
                      </button>
                      <button 
                        onClick={confirmRemoveReaction}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                      >
                          نعم، إزالة
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// --- Helper: Servant List Item ---

interface ServantListItemProps { 
    servant: User; 
    onClick: () => void; 
    isSelected: boolean; 
    requestsData: Record<string, any>; 
    classes: ClassGroup[]; 
    lastActivityTime?: number;
}

const ServantListItem: React.FC<ServantListItemProps> = ({ 
    servant, 
    onClick, 
    isSelected, 
    requestsData, 
    classes,
    lastActivityTime
}) => {
    // Calculate total unread messages across all classes for this servant
    const unreadCount = useMemo(() => {
        let count = 0;
        // Find all threads for this servant
        Object.keys(requestsData).forEach(key => {
            if (key.endsWith(`_${servant.id}`)) {
                const msgs = requestsData[key];
                Object.values(msgs).forEach((m: any) => {
                    if (!m.isRead && m.senderId === servant.id) count++;
                });
            }
        });
        return count;
    }, [requestsData, servant.id]);

    const servantClasses = classes.filter(c => c.servantIds?.includes(servant.id));

    return (
        <button
            onClick={onClick}
            className={`w-full p-3 rounded-xl flex items-start gap-3 transition-all text-right ${
                isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800' 
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-transparent'
            }`}
        >
            <div className="relative shrink-0">
                <Avatar src={servant.avatarUrl} name={servant.name} className="w-10 h-10 rounded-full bg-gray-200" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{servant.name}</h4>
                    {lastActivityTime && lastActivityTime > 0 && (
                        <span className="text-[10px] text-gray-400">
                            {new Date(lastActivityTime).toLocaleDateString('ar-EG', {month: 'numeric', day: 'numeric'})}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {servantClasses.length > 0 
                     ? servantClasses.map(c => c.name).join('، ')
                     : 'غير معين في فصل'}
                </p>
            </div>
        </button>
    );
};

// --- Servant View ---

interface ServantRequestsViewProps {
  currentUser: User;
  classes: ClassGroup[];
  requestsData: Record<string, any>; // Key: classId_servantId
  onSendMessage: (text: string, threadId: string) => void;
}

export const ServantRequestsView: React.FC<ServantRequestsViewProps> = ({
  currentUser,
  classes,
  requestsData,
  onSendMessage
}) => {
  // Filter classes assigned to this servant
  const myClasses = useMemo(() => classes.filter(c => c.servantIds?.includes(currentUser.id)), [classes, currentUser.id]);
  const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || '');

  // Handle case where classes might load later
  useEffect(() => {
    if (!selectedClassId && myClasses.length > 0) {
        setSelectedClassId(myClasses[0].id);
    }
  }, [myClasses, selectedClassId]);

  const currentThreadId = useMemo(() => `${selectedClassId}_${currentUser.id}`, [selectedClassId, currentUser.id]);
  const messages = useMemo(() => {
    const raw = requestsData[currentThreadId] || {};
    return Object.values(raw).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as RequestMessage[];
  }, [requestsData, currentThreadId]);

  const handleSend = (text: string) => {
    onSendMessage(text, currentThreadId);
  };

  const selectedClass = myClasses.find(c => c.id === selectedClassId);

  // Mock "Admin" user for UI purposes in Servant View
  const systemUser: User = { 
      id: 'system', 
      name: 'أمين الخدمة / أمين القطاع', 
      role: UserRole.ADMIN, 
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=random' 
  };

  if (myClasses.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
             <MessageCircle size={48} className="text-gray-300 mb-4" />
             <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">لا توجد فصول مسندة إليك بعد</h3>
             <p className="text-sm text-gray-500">يرجى التواصل مع أمين القطاع لإضافتك لفصل.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {myClasses.length > 1 && (
         <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
             <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                 <BookOpen size={18} className="text-indigo-500" />
                 اختر الفصل للتواصل:
             </span>
             <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {myClasses.map(cls => (
                    <button
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            selectedClassId === cls.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                            : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600'
                        }`}
                    >
                        {cls.name}
                    </button>
                ))}
             </div>
         </div>
      )}

      {selectedClass && (
          <ChatWindow 
            messages={messages}
            currentUser={currentUser}
            targetUser={systemUser}
            targetClass={selectedClass}
            onSendMessage={handleSend}
            threadId={currentThreadId}
          />
      )}
    </div>
  );
};

// --- Shared Logic for Secretary & Admin ---

interface RequestsManagerViewProps {
  currentUser: User;
  servants: User[]; // The list of servants to show
  classes: ClassGroup[];
  requestsData: Record<string, any>;
  onSendMessage: (text: string, threadId: string) => void;
  title: string;
}

const RequestsManagerView: React.FC<RequestsManagerViewProps> = ({
    currentUser,
    servants,
    classes,
    requestsData,
    onSendMessage,
    title
}) => {
    const [selectedServant, setSelectedServant] = useState<User | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    
    // Determine visibility state (List vs Chat)
    // Default is to show list (showList = true)
    const [showList, setShowList] = useState(true);

    // Sort and Filter Servants
    const filteredServants = useMemo(() => {
        // 1. Map servants to add "Last Activity" time
        const servantsWithTime = servants.map(servant => {
            let lastActivity = 0;
            // Iterate all threads relevant to this servant to find the latest timestamp
            Object.keys(requestsData).forEach(key => {
                if (key.endsWith(`_${servant.id}`)) {
                    const msgs = requestsData[key];
                    if (msgs) {
                        const timestamps = Object.values(msgs).map((m: any) => new Date(m.timestamp).getTime());
                        const maxTime = Math.max(...timestamps, 0);
                        if (maxTime > lastActivity) lastActivity = maxTime;
                    }
                }
            });
            return { ...servant, lastActivity };
        });

        // 2. Sort by Last Activity Descending
        servantsWithTime.sort((a, b) => b.lastActivity - a.lastActivity);

        // 3. Filter by Search Term
        if (!searchTerm.trim()) return servantsWithTime;
        
        return servantsWithTime.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()));
    }, [servants, searchTerm, requestsData]);

    const handleServantClick = (servant: User) => {
        const servantClasses = classes.filter(c => c.servantIds?.includes(servant.id));
        
        if (servantClasses.length === 0) {
            alert('هذا الخادم غير مسند لأي فصل، لا يمكن بدء محادثة.');
            return;
        }

        setSelectedServant(servant);

        if (servantClasses.length === 1) {
            // Only one class, auto-select and switch view
            setSelectedClassId(servantClasses[0].id);
            setIsClassModalOpen(false);
            setShowList(false); // Switch to chat view
        } else {
            // Multiple classes, ask user (Modal handles switching after selection)
            setIsClassModalOpen(true);
        }
    };

    const handleClassSelect = (classId: string) => {
        setSelectedClassId(classId);
        setIsClassModalOpen(false);
        setShowList(false); // Switch to chat view
    };

    const handleBackToList = () => {
        setShowList(true); // Return to list view
        setSelectedServant(null);
        setSelectedClassId(null);
    };

    // Calculate current messages
    const currentMessages = useMemo(() => {
        if (!selectedClassId || !selectedServant) return [];
        const threadId = `${selectedClassId}_${selectedServant.id}`;
        const raw = requestsData[threadId] || {};
        const msgs = Object.values(raw).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as RequestMessage[];
        
        return msgs;
    }, [requestsData, selectedClassId, selectedServant]);

    const currentThreadId = useMemo(() => {
        if (!selectedClassId || !selectedServant) return '';
        return `${selectedClassId}_${selectedServant.id}`;
    }, [selectedClassId, selectedServant]);

    // Mark messages as read when chat is open
    useEffect(() => {
        if (!showList && selectedClassId && selectedServant) {
            const threadId = `${selectedClassId}_${selectedServant.id}`;
            const raw = requestsData[threadId];
            if (raw) {
                Object.keys(raw).forEach(key => {
                    const msg = raw[key];
                    if (!msg.isRead && msg.senderId === selectedServant.id) {
                        updateData(`requests/${threadId}/${key}`, { isRead: true });
                    }
                });
            }
        }
    }, [requestsData, selectedClassId, selectedServant, showList]);

    const selectedClass = classes.find(c => c.id === selectedClassId);

    return (
        <div className="flex h-[calc(100vh-140px)] md:h-[650px] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
            
            {/* List Sidebar - Hides completely when chat is active */}
            <div className={`${showList ? 'flex' : 'hidden'} w-full flex-col h-full bg-white dark:bg-slate-800 z-10`}>
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
                    <div className="relative">
                        <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="بحث عن خادم..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-9 pl-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredServants.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">لا يوجد خدام مطابقين</div>
                    ) : (
                        filteredServants.map((servant: any) => (
                            <ServantListItem 
                                key={servant.id}
                                servant={servant}
                                isSelected={selectedServant?.id === servant.id}
                                onClick={() => handleServantClick(servant)}
                                requestsData={requestsData}
                                classes={classes}
                                lastActivityTime={servant.lastActivity}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area - Shows full width when active */}
            <div className={`${!showList ? 'flex' : 'hidden'} w-full flex-col h-full bg-white dark:bg-slate-800 relative z-20`}>
                {selectedServant && selectedClass ? (
                    <ChatWindow 
                        messages={currentMessages}
                        currentUser={currentUser}
                        targetUser={selectedServant}
                        targetClass={selectedClass}
                        onSendMessage={(text) => onSendMessage(text, currentThreadId)}
                        onBack={handleBackToList}
                        threadId={currentThreadId}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <MessageCircle size={64} className="mb-4 opacity-10" />
                        <p>خطأ في تحميل المحادثة</p>
                        <button onClick={handleBackToList} className="mt-2 text-indigo-500 underline text-sm">العودة للقائمة</button>
                    </div>
                )}
            </div>

            {/* Class Selection Modal */}
            {isClassModalOpen && selectedServant && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up border border-gray-100 dark:border-slate-700">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">اختر الفصل للمراسلة</h3>
                            <button onClick={() => setIsClassModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                الخادم <b>{selectedServant.name}</b> يخدم في أكثر من فصل. أي فصل تود إرسال الرسالة بخصوصه؟
                            </p>
                            <div className="space-y-2">
                                {classes.filter(c => c.servantIds?.includes(selectedServant.id)).map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => handleClassSelect(cls.id)}
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-all"
                                    >
                                        <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{cls.name}</span>
                                        <ChevronLeft size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Secretary View Wrapper ---

interface SecretaryRequestsViewProps {
  currentUser: User;
  users: User[];
  classes: ClassGroup[];
  requestsData: Record<string, any>;
  onSendMessage: (text: string, threadId: string) => void;
  sectorId: string;
}

export const SecretaryRequestsView: React.FC<SecretaryRequestsViewProps> = ({
  currentUser,
  users,
  classes,
  requestsData,
  onSendMessage,
  sectorId
}) => {
    // Filter servants to show ONLY those in the secretary's sector
    const mySectorServants = useMemo(() => {
        // Find classes in this sector
        const sectorClasses = classes.filter(c => c.sectorId === sectorId);
        
        // Find servants assigned to these classes OR directly assigned to the sector
        return users.filter(u => 
            u.role === UserRole.SERVANT && (
                u.sectorId === sectorId || 
                u.sectorIds?.includes(sectorId) ||
                // Also include servants assigned to classes in this sector (even if their main sectorId is different/missing)
                classes.some(c => c.sectorId === sectorId && c.servantIds?.includes(u.id))
            )
        );
    }, [users, classes, sectorId]);

    // Pass ONLY classes relevant to this sector for context
    const sectorClasses = useMemo(() => classes.filter(c => c.sectorId === sectorId), [classes, sectorId]);

    return (
        <RequestsManagerView 
            currentUser={currentUser}
            servants={mySectorServants}
            classes={sectorClasses}
            requestsData={requestsData}
            onSendMessage={onSendMessage}
            title="خدام القطاع"
        />
    );
};

// --- Admin View Wrapper ---

interface AdminRequestsViewProps {
  currentUser: User;
  users: User[];
  classes: ClassGroup[];
  requestsData: Record<string, any>;
  onSendMessage: (text: string, threadId: string) => void;
}

export const AdminRequestsView: React.FC<AdminRequestsViewProps> = ({
  currentUser,
  users,
  classes,
  requestsData,
  onSendMessage
}) => {
    // Admin sees ALL servants
    const allServants = useMemo(() => users.filter(u => u.role === UserRole.SERVANT), [users]);

    return (
        <RequestsManagerView 
            currentUser={currentUser}
            servants={allServants}
            classes={classes} // Admin sees all classes
            requestsData={requestsData}
            onSendMessage={onSendMessage}
            title="كل الخدام"
        />
    );
};
