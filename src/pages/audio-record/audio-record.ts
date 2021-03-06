import { Item } from './audio-record';
import { Component } from '@angular/core';
import { NavController, NavParams, Platform, DateTime } from 'ionic-angular';
import { Media, MediaObject } from '@ionic-native/media';
import { File } from '@ionic-native/file';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase';
import { AudioProvider } from 'ionic-audio';

export interface Item {
  audioName?: string,
  audioPath?: string,
  audioDuration?: number,
  audioCreate?: string,
  audioUpload?: string,
  audioUploadUrl?: string
}
@Component({
  selector: 'page-audio-record',
  templateUrl: 'audio-record.html',
  providers: [Media, File]
})
export class AudioRecordPage {
  recording: boolean = false;
  filePath: string;
  fileName: string;
  audio: MediaObject;
  audioList: any[] = [];
  interval: any;
  duration: number = 0;

  audioItems: Observable<Item[]>;
  audioCollections: AngularFirestoreCollection<Item>;

  constructor(public navCtrl: NavController,
              public navParams: NavParams, private media: Media,
              private file: File, public platform: Platform,
              private _firestore: AngularFirestore, private _audioProvider: AudioProvider) {

    this.audioCollections = _firestore.collection<Item>('voice_collections');
    this.audioItems = this.audioCollections.valueChanges();

  }

  ionViewDidLoad() {
    this.getAudioList();
    console.log('ionViewDidLoad AudioRecordPage');
  }
  startRecord(){
    if (this.platform.is('ios')) {
      this.fileName = 'record'+new Date().getDate()+new Date().getMonth()+new Date().getFullYear()+new Date().getHours()+new Date().getMinutes()+new Date().getSeconds()+'.wav';
      this.filePath = this.file.documentsDirectory.replace(/file:\/\//g, '') + this.fileName;
      this.audio = this.media.create(this.filePath);
    } else if (this.platform.is('android')) {
        this.fileName = 'record'+new Date().getDate()+new Date().getMonth()+new Date().getFullYear()+new Date().getHours()+new Date().getMinutes()+new Date().getSeconds()+'.wav';
        this.filePath = this.file.externalDataDirectory.replace(/file:\/\//g, '') + this.fileName;
        this.audio = this.media.create(this.filePath);
    }

    this.audio.startRecord();
    this.recording = true;
    this.getDuration();
  }
  getAudioList() {
    //this.audioItems.subscribe(audioData => console.log('audioItems: ', JSON.stringify(audioData)))
    this.audioItems = this.audioCollections.valueChanges();

  }
  stopRecord() {
    this.audio.stopRecord();
    this.recording = false;

    let audioData: Item = {
      audioName: this.fileName,
      audioDuration: this.duration,
      audioPath: this.filePath,
      audioUpload: 'me',
      audioCreate: new Date().toString(),
      audioUploadUrl: null
    }

    clearInterval(this.interval);
    this.duration = 0;
    this.getAudioList();


    this.startUploadAudio(audioData.audioName).then(fileURL => {
      console.log('upload files OK')
      audioData.audioUploadUrl = fileURL;
      this.addFirebase(audioData);

      this.removeAudioFile(this.file.externalDataDirectory, audioData.audioName).then(fileRemove => {
        console.log('remove files OK')
      })

    });

  }
  getDuration(){
    this.interval = setInterval(() => {
      if(this.duration == -1){
        this.duration = 1;
      }
      this.duration += 1;
      console.log(this.duration)
   }, 1000);
  }
  playAudio(audioFile: Item) {
  }

  removeAudioFile(path, fileName) {
    return this.file.removeFile(path, fileName);
  }

  addFirebase(item: Item){
    this.audioCollections.add(item).then(data => console.log(data)).catch(err => console.log(err));
    console.log('addItem OK')
  }
  startUploadAudio(fileName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let storageRef = firebase.storage().ref();
      this.file.readAsDataURL(this.file.externalDataDirectory, fileName).then((file) => {
        let voiceRef = storageRef.child('voices/'+fileName).putString(file, firebase.storage.StringFormat.DATA_URL);
        voiceRef.on(firebase.storage.TaskEvent.STATE_CHANGED, (snapshot) => {
          console.log("uploading");
        }, (e) => {
          reject(e)
          console.log(JSON.stringify(e, null, 2));
        }, () => {
          var downloadURL = voiceRef.snapshot.downloadURL;
          resolve(downloadURL);
        });
      });
    });

  }
}
