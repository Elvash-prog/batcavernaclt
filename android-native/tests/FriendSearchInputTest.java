package dev.gamersclt.batcaverna.nativeapp;
public class FriendSearchInputTest {
 static int checks;
 static void check(boolean value){checks++;if(!value)throw new AssertionError("check "+checks);}
 static void invalid(String s){try{FriendSearchInput.term(s);throw new AssertionError("Accepted invalid search");}catch(IllegalArgumentException expected){checks++;}}
 public static void main(String[] args){
  check(FriendSearchInput.term(" @Elvash ").equals("Elvash"));check(FriendSearchInput.term("João Silva").equals("João Silva"));
  check(FriendSearchInput.filter("foo),id.eq.*").equals("foo id eq"));check(FriendSearchInput.filter("john_doe").equals("john doe"));
  invalid(null);invalid(" @x ");invalid("x".repeat(81));
  check(FriendSearchInput.current(2,2,"one","one",true));check(!FriendSearchInput.current(1,2,"one","one",true));check(!FriendSearchInput.current(2,2,"one","two",true));check(!FriendSearchInput.current(2,2,"one","one",false));
  check(AccountMediaSource.normalize("avatars/a/photo.jpg","https://example.test").equals("https://example.test/storage/v1/object/authenticated/avatars/a/photo.jpg"));
  check(AccountMediaSource.normalize("b77213ce-3a64-463d-a816-f7ab46dbe5df/photo.jpg","https://example.test").contains("/avatars/"));
  check(AccountMediaSource.normalize("../private.jpg","https://example.test").isEmpty());check(AccountMediaSource.normalize("//example.test/photo.jpg","https://example.test").isEmpty());
  check(AccountMediaSource.normalize("https://media.rawg.io/photo.jpg","https://example.test").equals("https://media.rawg.io/photo.jpg"));
  System.out.println("Friend search/media: "+checks+" checks passed");
 }
}
