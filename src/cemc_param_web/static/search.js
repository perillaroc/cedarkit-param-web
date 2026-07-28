/* 列表页即时过滤：纯显隐切换，零网络请求，file:// 下可用。
   生成期已把搜索索引写入每行的 data-search、discipline 写入 data-discipline。 */
(function () {
  var q = document.getElementById("filter-q");
  var sel = document.getElementById("filter-discipline");
  var count = document.getElementById("filter-count");
  var rows = Array.prototype.slice.call(
    document.querySelectorAll("#param-table tbody tr")
  );

  function apply() {
    var terms = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var discipline = sel.value;
    var shown = 0;
    rows.forEach(function (row) {
      var text = row.getAttribute("data-search");
      var ok = (!discipline || row.getAttribute("data-discipline") === discipline) &&
        terms.every(function (t) { return text.indexOf(t) !== -1; });
      row.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    count.textContent = shown + " / " + rows.length + " 条";
  }

  q.addEventListener("input", apply);
  sel.addEventListener("change", apply);
  apply();
})();
