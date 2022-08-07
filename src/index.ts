import AgoraRTC from 'agora-rtc-sdk-ng';
import { v4 as uuidv4 } from 'uuid';
import type { IMicrophoneAudioTrack, IAgoraRTCClient, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import './index.css';

type RTC = {
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  client: IAgoraRTCClient | null;
};

let rtc: RTC = {
  localAudioTrack: null,
  localVideoTrack: null,
  client: null,
};

type Options = Readonly<{
  appId: string;
  channel: string;
  token: string;
}>;
const options: Options = {
  appId: 'Your appId',
  channel: 'Your channel',
  token: 'Your token',
};

window.onload = () => {
  rtc.client = AgoraRTC.createClient({
    mode: 'live',
    codec: 'vp8',
  });

  document.getElementById('host-join').onclick = () => onClickHostJoin();
  document.getElementById('audience-join').onclick = () => onClickAudienceJoin();
  document.getElementById('leave').onclick = () => onClickLeave();
};

const onClickHostJoin = async (): Promise<void> => {
  rtc.client.setClientRole('host');

  const { appId, channel, token } = options;
  const uid = uuidv4();
  await rtc.client.join(appId, channel, token, uid);

  rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();

  await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);

  const localPlayerContainer = createPlayerContainer(uid.toString(), 'local');
  rtc.localVideoTrack.play(localPlayerContainer);

  console.log('publish success!!');
};

const onClickAudienceJoin = async (): Promise<void> => {
  rtc.client.setClientRole('audience');

  const { appId, channel, token } = options;
  const uid = uuidv4();
  await rtc.client.join(appId, channel, token, uid);

  rtc.client.on('user-published', async (user, mediaType) => {
    await rtc.client.subscribe(user, mediaType);
    console.log('subscribe success!!');

    switch (mediaType) {
      case 'video':
        {
          const remotePlayerContainer = createPlayerContainer(user.uid.toString(), 'remote');
          user.videoTrack.play(remotePlayerContainer);
        }
        break;
      case 'audio':
        user.audioTrack.play();
        break;
    }
  });

  rtc.client.on('user-unpublished', ({ uid }) => {
    const remotePlayerContainer = document.getElementById(uid.toString());
    remotePlayerContainer.remove();
  });
};

const onClickLeave = async (): Promise<void> => {
  rtc.localAudioTrack.close();
  rtc.localVideoTrack.close();
  rtc.client.remoteUsers.forEach(({ uid }) => {
    const playerContainer = document.getElementById(uid.toString());
    if (playerContainer !== null) {
      playerContainer.remove();
    }
  });

  await rtc.client.leave();
};

const createPlayerContainer = (uid: string, type: 'local' | 'remote'): HTMLDivElement => {
  const playerContainer = document.createElement('div');
  playerContainer.id = uid;
  playerContainer.textContent = type === 'local' ? `Local user: ${uid}` : `Remote user: ${uid}`;
  playerContainer.style.width = '640px';
  playerContainer.style.height = '480px';
  document.body.append(playerContainer);

  return playerContainer;
};
