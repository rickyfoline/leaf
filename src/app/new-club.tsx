import { useRouter } from 'expo-router';
import { useState } from 'react';

import { TopBar } from '@/components/top-bar';
import { Button, H1, Input, Muted, PlusBadge, Screen, Toggle } from '@/components/ui';
import * as repo from '@/db/repo';
import { FREE_CLUBS } from '@/lib/plus';
import { useApp, useGate, useLive, useWrite } from '@/state/app';

export default function NewClub() {
  const router = useRouter();
  const gate = useGate();
  const write = useWrite();
  const { plus, toast } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const created = useLive((db) => repo.myClubCount(db), []) ?? 0;

  const save = async () => {
    if (!name.trim()) return toast('Give your club a name');
    if (!plus && created >= FREE_CLUBS) return gate('clubs');
    await write((db) => repo.createClub(db, { name, description, isPrivate }));
    toast(`Club created: ${name.trim()}`);
    router.back();
  };

  return (
    <Screen header={<TopBar left="cancel" right="none" />}>
      <H1 center style={{ fontSize: 22 }}>Create a Club</H1>
      <Input label="Club name" value={name} onChangeText={setName} maxLength={40} placeholder="e.g. Sunday Classics" />
      <Input label="What is it about?" value={description} onChangeText={setDescription} maxLength={200} multiline placeholder="Tell readers what you will read together"
        style={{ minHeight: 80, textAlignVertical: 'top' }} />
      <Toggle label="Private club (invite only)" value={isPrivate} right={plus ? null : <PlusBadge />} onPress={() => gate('private') && setPrivate(!isPrivate)} />
      <Muted style={{ marginTop: 10, lineHeight: 18 }}>
        {plus ? 'Plus lets you create as many clubs as you like.' : `Free accounts can create ${FREE_CLUBS} public club. You have created ${created}.`}
      </Muted>
      <Button block title="Create Club" style={{ marginTop: 20 }} onPress={save} />
    </Screen>
  );
}
