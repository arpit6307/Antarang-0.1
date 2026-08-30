import React, { useState } from 'react';
import { motion } from 'motion/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useDiaries } from '@/hooks/useDiaries';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function InvitePartnerModal({ isOpen, onClose, diary }) {
  const { user } = useAuth();
  const { updateDiary, joinSharedDiaryByCode, removeCollaborator, leaveSharedDiary } = useDiaries();

  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'join' | 'members'
  const [inviteCode, setInviteCode] = useState(diary?.inviteCode || '');
  const [copied, setCopied] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState({ type: '', text: '' });
  const [removingUid, setRemovingUid] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const isOwner = diary ? (diary.ownerUid ? diary.ownerUid === user?.uid : true) : false;
  const collaboratorProfiles = diary?.collaboratorProfiles || {};
  const memberList = Object.values(collaboratorProfiles);

  const handleGenerateCode = async () => {
    if (!diary || !user) return;
    setIsGenerating(true);
    try {
      const randomCode = 'LOVE-' + Math.floor(1000 + Math.random() * 9000);
      const updates = {
        isShared: true,
        inviteCode: randomCode,
        collaboratorUids: diary.collaboratorUids || [user.uid],
        [`collaboratorProfiles.${user.uid}`]: {
          uid: user.uid,
          displayName: user.displayName || 'Owner',
          photoURL: user.photoURL || '',
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      };

      // Save top-level lookup doc for fail-proof joins
      try {
        await setDoc(doc(db, 'invite_codes', randomCode), {
          ownerUid: diary.ownerUid || user.uid,
          diaryId: diary.id,
          diaryName: diary.name,
          createdAt: new Date().toISOString(),
        });
      } catch (_) {}

      await updateDiary(diary.id, updates, diary.ownerUid || user.uid);
      setInviteCode(randomCode);
    } catch (err) {
      console.warn('Error generating invite code:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoinDiary = async (e) => {
    e.preventDefault();
    if (!partnerCodeInput.trim()) return;
    setIsJoining(true);
    setJoinMsg({ type: '', text: '' });

    try {
      const res = await joinSharedDiaryByCode(partnerCodeInput.trim().toUpperCase());
      if (res.success) {
        setJoinMsg({ type: 'success', text: `Successfully joined "${res.diaryName}"!` });
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setJoinMsg({ type: 'error', text: res.error || 'Invalid code or diary not found.' });
      }
    } catch (err) {
      setJoinMsg({ type: 'error', text: 'Failed to join diary. Please try again.' });
    } finally {
      setIsJoining(false);
    }
  };

  const handleRemoveMember = async (targetUid) => {
    if (!diary || !targetUid) return;
    setRemovingUid(targetUid);
    try {
      await removeCollaborator(diary.id, targetUid, diary.ownerUid);
    } catch (err) {
      console.error('Error removing collaborator:', err);
    } finally {
      setRemovingUid(null);
    }
  };

  const handleLeaveJournal = async () => {
    if (!diary || !user) return;
    setIsLeaving(true);
    try {
      await leaveSharedDiary(diary.id, diary.ownerUid, diary.inviteCode);
      onClose();
    } catch (err) {
      console.error('Error leaving diary:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lovebirds and Besties Co-Journaling">
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gold/15 text-xs font-serif font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'invite'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-transparent text-midnight/60 hover:text-midnight'
            }`}
          >
            Invite Partner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'join'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-transparent text-midnight/60 hover:text-midnight'
            }`}
          >
            Join Shared Diary
          </button>
          {diary && (
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'members'
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-transparent text-midnight/60 hover:text-midnight'
              }`}
            >
              Joined Members ({memberList.length || 1})
            </button>
          )}
        </div>

        {/* Tab 1: Invite */}
        {activeTab === 'invite' && (
          <div className="space-y-4 font-sans">
            <p className="text-xs text-midnight/80 leading-relaxed">
              Share your diary with your lovebird or best friend so both of you can write entries together and chat live!
            </p>

            {inviteCode ? (
              <div className="p-4 rounded-xl bg-gold/10 border border-gold/30 text-center space-y-3">
                <span className="text-[11px] uppercase font-serif tracking-wider text-midnight/70 font-bold block">
                  Your Unique Shared Invite Code
                </span>
                <div className="text-2xl font-mono font-bold tracking-widest text-gold-dark select-all">
                  {inviteCode}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  icon={<Icon name={copied ? 'check' : 'copy'} size={14} />}
                >
                  {copied ? 'Code Copied!' : 'Copy Code to Share'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Button
                  type="button"
                  variant="primary"
                  loading={isGenerating}
                  onClick={handleGenerateCode}
                  icon={<Icon name="sparkles" size={16} />}
                >
                  Generate Partner Invite Code
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Join */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinDiary} className="space-y-4 font-sans">
            <p className="text-xs text-midnight/80 leading-relaxed">
              Enter the 6-character Invite Code shared by your partner or friend to join their diary bookshelf:
            </p>

            <Input
              label="Enter Invite Code"
              value={partnerCodeInput}
              onChange={(e) => setPartnerCodeInput(e.target.value)}
              placeholder="e.g. LOVE-3196"
              required
            />

            {joinMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-serif flex items-center gap-2 border ${
                  joinMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <Icon name={joinMsg.type === 'success' ? 'check' : 'alert-circle'} size={16} />
                <span>{joinMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={isJoining}
                disabled={!partnerCodeInput.trim()}
              >
                Join Diary
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Joined Members */}
        {activeTab === 'members' && diary && (
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-gold/15 pb-2">
              <h4 className="font-serif font-bold text-xs text-midnight">
                Co-Authors & Joined Members
              </h4>
              <span className="text-[10px] font-mono text-gold font-bold">
                {memberList.length || 1} Total
              </span>
            </div>

            {memberList.length === 0 ? (
              <div className="p-4 rounded-xl bg-gold/10 text-center text-xs text-midnight/80 font-serif">
                Only you are in this diary currently. Share your invite code in Tab 1 to add your partner or bestie!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {memberList.map((member) => {
                  const memberIsOwner = member.role === 'owner' || member.uid === diary.ownerUid;
                  const isMe = member.uid === user?.uid;

                  return (
                    <div
                      key={member.uid}
                      className="p-3 rounded-xl border border-gold/20 bg-cream/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-gold/30 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 text-sm">
                            {member.displayName?.[0] || 'M'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-xs font-bold text-midnight truncate">
                              {member.displayName} {isMe ? '(You)' : ''}
                            </span>
                            {memberIsOwner ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold text-midnight font-serif font-bold shrink-0 flex items-center gap-1">
                                <Icon name="crown" size={10} />
                                <span>Admin / Owner</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 font-serif font-bold shrink-0 flex items-center gap-1">
                                <Icon name="heart-outline" size={10} />
                                <span>Partner</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ink-muted block truncate">
                            Joined {new Date(member.joinedAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button for Owner */}
                      {isOwner && !memberIsOwner && !isMe && (
                        <button
                          type="button"
                          disabled={removingUid === member.uid}
                          onClick={() => handleRemoveMember(member.uid)}
                          className="px-2.5 py-1 rounded-lg text-xs font-serif border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Icon name="trash" size={12} />
                          <span>{removingUid === member.uid ? 'Removing...' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leave Shared Diary Button for Joined Non-Owner Members */}
            {!isOwner && (
              <div className="pt-2 border-t border-gold/15 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  loading={isLeaving}
                  onClick={handleLeaveJournal}
                  icon={<Icon name="log-out" size={14} />}
                  className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs"
                >
                  Leave Shared Journal
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
