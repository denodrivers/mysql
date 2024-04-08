import { replaceParams } from "./util.ts";

export class Order {
  value: string = "";
  static by(field: string) {
    const order = new Order();
    return {
      get desc() {
        order.value = replaceParams("?? DESC", [field]);
        return order;
      },
      get asc() {
        order.value = replaceParams("?? ASC", [field]);
        return order;
      },
    };
  }
}
