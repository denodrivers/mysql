import { test } from "https://deno.land/x/testing/mod.ts";
import { replaceParams } from "../src/packets/builders/query.ts";
import { assertEquals } from "https://deno.land/x/testing/asserts.ts";

test(function testIdReplace() {
    assertEquals(replaceParams("?? ?", ["id", "val"]), '`id` "val"');
    assertEquals(replaceParams("??", ["id"]), "`id`");
    assertEquals(replaceParams("??", [1]), "`1`");
    assertEquals(replaceParams("??", [true]), "`true`");
    assertEquals(replaceParams("??", []), "``");
    assertEquals(replaceParams("?", ["string"]), `"string"`);
    assertEquals(replaceParams("?", [123]), `123`);
    assertEquals(replaceParams("?", [new Date(1551244259181)]), `2019-02-27 13:10:59`);
    assertEquals(replaceParams("?", [`"test"`]), '"\\"test\\""');
    assertEquals(replaceParams("?", [["a", "b", "c", "d"]]), '("a","b","c","d")');
    assertEquals(replaceParams("?", [[1, 2, 3, 4]]), '(1,2,3,4)');
    assertEquals(replaceParams("??", [["a", "b", "c"]]), '(`a`,`b`,`c`)');

    let keys: string[] = ["a", "b", "c"];
    assertEquals(replaceParams("??", [keys]), '(`a`,`b`,`c`)');
    assertEquals(replaceParams("??", [Object.keys({ a: 1, b: 1, c: 1 })]), '(`a`,`b`,`c`)');

    const query = replaceParams(
        `select ??, ?? from ?? where ?? = ? and ?? = ? and is_admin = ?`,
        ["name", "email", "users", "id", 1, "name", "manyuanrong", true]
    );
    assertEquals(query, 'select `name`, `email` from `users` where `id` = 1 and `name` = "manyuanrong" and is_admin = true');
});