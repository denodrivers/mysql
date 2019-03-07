import { test } from "https://deno.land/x/testing/mod.ts";
import { replaceParams } from "../src/packets/builders/query.ts";
import { equal } from "https://deno.land/x/testing/asserts.ts";

test(function testIdReplace() {
    equal(replaceParams("?? ?", ["id", "val"]), '`id` "val"');
    equal(replaceParams("??", ["id"]), "`id`");
    equal(replaceParams("??", [1]), "`1`");
    equal(replaceParams("??", [true]), "`true`");
    equal(replaceParams("??", []), "``");
    equal(replaceParams("?", ["string"]), `"string"`);
    equal(replaceParams("?", [123]), `123`);
    equal(replaceParams("?", [new Date(1551244259181)]), `2019-02-27 13:10:59`);
    equal(replaceParams("?", [`"test"`]), '"\\"test\\""');
    equal(replaceParams("?", [["a", "b", "c", "d"]]), '("a","b","c","d")');
    equal(replaceParams("?", [[1, 2, 3, 4]]), '(1,2,3,4)');

    const query = replaceParams(
        `select ??, ?? from ?? where ?? = ? and ?? = ? and is_admin = ?`,
        ["name", "email", "users", "id", 1, "name", "manyuanrong", true]
    );
    equal(query, 'select `name`, `email` from `users` where `id` = 1 and `name` = "manyuanrong" and is_admin = true');
});