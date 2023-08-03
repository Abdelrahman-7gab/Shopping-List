import { Injectable } from '@angular/core';
import { ItemModel } from '../interfaces/ItemModel';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private items$: BehaviorSubject<ItemModel[]>;
  private totalCartPrice$: BehaviorSubject<number>;
  // a unique ID for each tab to identify which tab is the source of the local storage event
  private tabID: string;

  public getItems$() {
    return this.items$.asObservable();
  }

  public getTotalCartPrice$() {
    return this.totalCartPrice$.asObservable();
  }

  public addItem(item: ItemModel) {;
    const items = this.items$.getValue();
    // check if item id already exists in the list
    if (items.find((i) => i.id === item.id)) {
      this.updateItem(item);
      return;
    }
    items.push(item);
    this.items$.next(items);
  }

  public removeItem(item: ItemModel) {
    const items = this.items$.getValue();
    const index = items.findIndex((i) => i.id === item.id);
    items.splice(index, 1);
    this.items$.next(items);
  }

  public updateItem(item: ItemModel) {
    const items = this.items$.getValue();
    const index = items.findIndex((i) => i.id === item.id);
    items[index] = item;
    this.items$.next(items);
  }

  public addToCart(item: ItemModel) {
    const items = this.items$.getValue();
    const index = items.findIndex((i) => i.id === item.id);
    if (items[index].amountInStock > 0) {
      items[index].amountInStock--;
      items[index].amountInCart++;
      this.items$.next(items);
    } else {
      alert('There’s not enough of this item left.');
    }
  }

  public subtractFromCart(item: ItemModel) {
    const items = this.items$.getValue();
    const index = items.findIndex((i) => i.id === item.id);
    if (items[index].amountInCart > 0) {
      items[index].amountInStock++;
      items[index].amountInCart--;
      this.items$.next(items);
    }
  }

  public clearCart() {
    const items = this.items$.getValue();
    items.forEach((item) => {
      item.amountInStock = item.amountInStock + item.amountInCart;
      item.amountInCart = 0;
    });
    this.items$.next(items);
  }

  CartPriceSubscribtion() {
    this.items$.subscribe((items) => {
      const totalPrice = items.reduce(
        (acc, item) => acc + item.price * item.amountInCart,
        0
      );
      this.totalCartPrice$.next(totalPrice);
    });
  }

  loadFromLocalStorage() {
    const data = localStorage.getItem('items');
    if (data) {
      this.items$.next(JSON.parse(data).items);
    }
  }

  syncWithLocalStorage() {
    this.items$.subscribe((items) => {
      // add tab id to the items to check if the changes are made by the current tab
      const data = { tabID: this.tabID, items: items };

      // check that the data is not already saved in local storage but with a different tab id to avoid an infinite loop
      const localData = localStorage.getItem('items');
      if (localData) {
        const parsedData = JSON.parse(localData);
        if (JSON.stringify(parsedData.items) === JSON.stringify(items)) {
          return;
        }
      }

      localStorage.setItem('items', JSON.stringify(data));
    });

    // subscribe to changes in local storage in case of using multiple tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'items' && event.newValue) {
        const data = JSON.parse(event.newValue);
        if (data.tabID !== this.tabID) {
          this.items$.next(data.items);
        }
      }
    });
  }

  constructor() {
    this.items$ = new BehaviorSubject<ItemModel[]>([]);
    this.totalCartPrice$ = new BehaviorSubject<number>(0);
    this.tabID = uuidv4();

    // update total price when items change
    this.CartPriceSubscribtion();
    // load items from local storage
    this.loadFromLocalStorage();
    // any changes to items will be saved to local storage and changes in other tabs will be synced
    this.syncWithLocalStorage();
  }
}