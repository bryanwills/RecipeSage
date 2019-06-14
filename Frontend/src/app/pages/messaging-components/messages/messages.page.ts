import { Component } from '@angular/core';
import { NavController, ToastController, ModalController, Events } from '@ionic/angular';

import { MessagingService } from '@/services/messaging.service';
import { LoadingService } from '@/services/loading.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-messages',
  templateUrl: 'messages.page.html',
  styleUrls: ['messages.page.scss']
})
export class MessagesPage {

  threads: any = [];

  constructor(
    public navCtrl: NavController,
    public events: Events,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public messagingService: MessagingService) {

    this.messagingService.requestNotifications();

    this.websocketService.register('messages:new', payload => {
      this.loadThreads();
    }, this);
  }

  ionViewWillEnter() {
    var loading = this.loadingService.start();
    this.loadThreads().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  refresh(refresher) {
    this.loadThreads().then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads({
        includeMessages: true,
        messageLimit: 1
      }).then(response => {
        this.threads = response.sort((a, b) => {
          let aCreatedAt = new Date((a.messages[0] || []).updatedAt);
          let bCreatedAt = new Date((b.messages[0] || []).updatedAt);
          // Ascending (newest first)
          return bCreatedAt.valueOf() - aCreatedAt.valueOf();
        });

        resolve();
      }).catch(async err => {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
            break;
          default:
            let errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  openThread(thread) {
    // this.navCtrl.push('MessageThreadPage', {
    //   thread: thread,
    //   otherUserId: thread.otherUser.id
    // });
  }

  async newThread() {
    let modal = await this.modalCtrl.create({
      component: 'NewMessageModalPage'
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.destination) return;

      if (data.setRoot) {
        // this.navCtrl.setRoot(data.destination, data.routingData || {}, {animate: true, direction: 'forward'});
      } else {
        // this.navCtrl.push(data.destination, data.routingData);
      }
    });
  }

  isNotificationsCapable() {
    return this.messagingService.isNotificationsCapable();
  }

  isNotificationsEnabled() {
    return this.messagingService.isNotificationsEnabled();
  }
}