import { formatArea } from "@/lib/calculations";
import { linesWithUnifiedMillingNotes, specificationLineText } from "@/lib/specification-line-display";
import type { Order, SpecificationLine } from "@/lib/types";

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function repairText(value: unknown) {
  let text = String(value ?? "");

  for (let index = 0; index < 3; index += 1) {
    if (!/[ГѓГ‚ГђГ‘Р ][\s\S]*[Г‚ГѓГђГ‘]/.test(text)) {
      break;
    }

    const repaired = Buffer.from(text, "latin1").toString("utf8");

    if (repaired === text || repaired.includes("\uFFFD")) {
      break;
    }

    text = repaired;
  }

  return text;
}

function textValue(value: unknown) {
  return htmlEscape(repairText(value));
}

function cell(value: unknown, className = "") {
  return `<td class="${className}">${textValue(value)}</td>`;
}

function money(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function numberValue(value: number | undefined, precision = 2) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: precision
  }).format(value);
}

function dateValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1].slice(-2)}` : value;
}

function statusLabel(status: Order["status"]) {
  const labels: Record<Order["status"], string> = {
    draft: "Черновик",
    confirmed: "Подтвержден",
    in_production: "В производстве",
    on_hold: "Ожидание",
    ready: "Готов",
    shipped: "Отгружен",
    closed: "Закрыт",
    cancelled: "Отменен"
  };

  return labels[status] ?? status;
}

function visibleText(line: SpecificationLine) {
  return repairText(specificationLineText(line));
}

function customerContacts(order: Order) {
  return [order.customer.phone, order.customer.email]
    .filter((value): value is string => Boolean(value))
    .map((value) => textValue(value));
}

function renderLineRows(lines: SpecificationLine[]) {
  return lines
    .map((line) => {
      const description = visibleText(line);

      if (line.lineType === "group") {
        return `<tr class="group-row">
          ${cell("")}
          <td colspan="13">${htmlEscape(description)}</td>
        </tr>`;
      }

      if (line.lineType === "empty" && !description && !line.heightMm && !line.widthMm && !line.quantity && !line.totalPrice) {
        return `<tr class="empty-row"><td colspan="14"></td></tr>`;
      }

      if (line.lineType === "comment" && !line.heightMm && !line.widthMm && !line.totalPrice) {
        return `<tr class="note-row">
          ${cell("")}
          ${cell("")}
          <td colspan="8">${htmlEscape(description)}</td>
          ${cell("")}
          ${cell("")}
          ${cell("")}
          ${cell("")}
        </tr>`;
      }

      return `<tr>
        ${cell("")}
        ${cell(numberValue(line.heightMm, 0), "num")}
        ${cell(numberValue(line.widthMm, 0), "num")}
        ${cell(numberValue(line.quantity, 3), "num")}
        <td colspan="5">${htmlEscape(description)}</td>
        ${cell(money(line.pricePerM2 ?? line.unitPrice), "num price-cell")}
        ${cell(numberValue(line.unitAreaM2, 6), "num")}
        ${cell(numberValue(line.totalAreaM2, 6), "num")}
        ${cell(money(line.unitPrice), "num")}
        ${cell(money(line.totalPrice), "num total-cell")}
      </tr>`;
    })
    .join("");
}

function renderCustomerFooter(order: Order) {
  const contacts = customerContacts(order);
  const deliveryMarkup = order.deliveryRequired
    ? `<div class="delivery-box">
        <div class="delivery-title">ДОСТАВКА</div>
        <div class="delivery-address">${textValue(order.deliveryAddress ?? "Адрес не указан")}</div>
      </div>`
    : "";

  return `<div class="footer-customer ${order.deliveryRequired ? "footer-customer-with-delivery" : ""}">
      <div class="customer-meta">
        <div class="customer-label">Заказчик</div>
        <div class="customer-name">${textValue(order.customer.name)}</div>
        ${
          contacts.length > 0
            ? contacts.map((contact) => `<div class="customer-contact">${contact}</div>`).join("")
            : '<div class="customer-contact">Контакты не указаны</div>'
        }
      </div>
      ${deliveryMarkup}
    </div>`;
}

export async function renderPrintHtml(order: Order) {
  const visibleLines = linesWithUnifiedMillingNotes(order.lines.filter((line) => line.isPrinted));
  const quantityTotal = visibleLines.reduce((total, line) => total + (line.quantity ?? 0), 0);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>Спецификация ${htmlEscape(order.specificationNumber)}</title>
    <style>
      @page { size: A4 portrait; margin: 7mm; }
      * { box-sizing: border-box; }
      html { background: #fff; }
      body { margin: 0; background: #fff; color: #000; font-family: Calibri, Arial, sans-serif; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.2px; line-height: 1.12; }
      td, th { border: 1px solid #000; padding: 2px 3px; height: 17px; vertical-align: middle; overflow-wrap: anywhere; word-break: normal; }
      th { background: #d9d9d9; font-size: 8px; font-weight: 700; text-align: center; }
      .sheet { width: 196mm; min-height: 283mm; margin: 0 auto; background: #fff; padding: 1.5mm; overflow: hidden; }
      .blank { border: 0; }
      .logo-row td { height: 13px; }
      .logo { border: 0; padding: 0 8px 3px 2px; text-align: left; vertical-align: middle; }
      .logo img { display: block; width: 100%; max-width: 360px; max-height: 58px; object-fit: contain; object-position: left center; filter: grayscale(1); }
      .label { border: 0; color: #333; font-size: 7.2px; text-align: center; }
      .section { border: 0; font-weight: 700; text-align: right; text-transform: uppercase; }
      .title { border: 0; font-size: 13px; font-weight: 700; text-align: right; white-space: nowrap; }
      .value { background: #e7e7e7; font-weight: 700; font-size: 9px; }
      .num { text-align: right; white-space: nowrap; }
      .center { text-align: center; }
      .total-cell { font-weight: 700; }
      .price-cell { background: #ededed; font-weight: 700; }
      .group-row td { background: #dedede; font-weight: 700; text-align: center; }
      .empty-row td { height: 17px; background: #c9c9c9; }
      .note-row td { color: #333; font-style: italic; }
      .quantity-total { background: #e0e0e0; font-size: 10px; font-weight: 700; text-align: center; }
      .warning-row td { border: 0; height: 54px; }
      .warning { font-size: 8.5px; font-weight: 700; line-height: 1.28; text-align: center; }
      .sign td { height: 32px; border: 0; border-bottom: 1px solid transparent; font-family: "Times New Roman", serif; font-size: 9px; }
      .signature-name { font-size: 11px !important; font-weight: 700; text-align: center; }
      .footer-details { padding: 0; border: 0; }
      .footer-layout { display: grid; grid-template-columns: 1.05fr 1.25fr; min-height: 96px; }
      .footer-company,
      .footer-customer { padding: 6px 6px 7px; }
      .footer-company { border-right: 0; font-size: 7.8px; line-height: 1.24; }
      .footer-company-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; row-gap: 2px; }
      .footer-customer { display: grid; grid-template-columns: 1fr; align-items: center; gap: 8px; }
      .footer-customer-with-delivery { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
      .customer-meta { display: flex; flex-direction: column; gap: 4px; font-size: 10px; padding-right: 8px; }
      .customer-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #3f3f46; }
      .customer-name { font-size: 14px; font-weight: 700; line-height: 1.2; }
      .customer-contact { font-size: 10px; line-height: 1.3; }
      .delivery-box { display: flex; min-height: 76px; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #555; padding: 8px 10px; text-align: center; color: #000; }
      .delivery-title { font-size: 22px; font-weight: 700; letter-spacing: 0; line-height: 1.05; }
      .delivery-address { margin-top: 8px; font-size: 14px; font-weight: 500; line-height: 1.28; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sheet { width: auto; min-height: auto; margin: 0; padding: 0; transform: none; }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <table aria-label="Печатная форма спецификации">
        <colgroup>
          <col style="width: 3%" />
          <col style="width: 6%" />
          <col style="width: 6%" />
          <col style="width: 5%" />
          <col style="width: 7.5%" />
          <col style="width: 7.5%" />
          <col style="width: 7.5%" />
          <col style="width: 7.5%" />
          <col style="width: 7.5%" />
          <col style="width: 7%" />
          <col style="width: 6.5%" />
          <col style="width: 6.5%" />
          <col style="width: 7.5%" />
          <col style="width: 8%" />
        </colgroup>
        <tbody>
          <tr class="logo-row">
            <td colspan="8" rowspan="5" class="logo">
              <img src="/print-logo-bw.png" alt="Логотип" />
            </td>
            <td colspan="6" class="blank"></td>
          </tr>
          <tr class="logo-row"><td colspan="6" class="blank"></td></tr>
          <tr class="logo-row"><td colspan="6" class="blank"></td></tr>
          <tr class="logo-row"><td colspan="6" class="blank"></td></tr>
          <tr class="logo-row"><td colspan="6" class="blank"></td></tr>

          <tr>
            <td class="blank"></td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="3" class="title">Спецификация №</td>
            <td class="value center">${htmlEscape(order.specificationNumber)}</td>
            <td class="center">от</td>
            <td class="value center">${htmlEscape(dateValue(order.documentDate))}</td>
            <td class="blank"></td>
            <td class="value center">${textValue(order.customerLegalType)}</td>
            <td colspan="3" class="value center">${textValue(order.customer.name)}</td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="3" class="label">номер</td>
            <td class="label"></td>
            <td colspan="2" class="label">дата оформления</td>
            <td class="blank"></td>
            <td class="label">юр/ч.л</td>
            <td colspan="3" class="label">заказчик</td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="8" class="blank"></td>
            <td colspan="2" class="section">${htmlEscape(statusLabel(order.status))}</td>
            <td class="value center">${htmlEscape(dateValue(order.productionStartedAt))}</td>
          </tr>
          <tr>
            <td colspan="11" class="blank"></td>
            <td colspan="2" class="section">Дата готовности</td>
            <td class="value center">${htmlEscape(dateValue(order.readyAt))}</td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td colspan="2" class="value center">${textValue(order.category?.name ?? "")}</td>
            <td colspan="2" class="value center">${textValue(order.materialType?.name ?? "")}</td>
            <td class="value center">${htmlEscape(String(order.thicknessMm ?? ""))}</td>
            <td colspan="3" class="value center">${textValue(order.millingType?.name ?? "")}</td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="2" class="section">Дата отгрузки</td>
            <td class="value center">${htmlEscape(dateValue(order.shippedAt))}</td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td colspan="2" class="label">категория</td>
            <td colspan="2" class="label">тип</td>
            <td class="label">толщина</td>
            <td colspan="3" class="label">фрезеровка</td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="2" class="section">остаток</td>
            <td class="num value">${money(order.balanceAmount)}</td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="4" class="value center">${textValue(order.colorCode ?? "")}</td>
            <td colspan="5" class="blank"></td>
            <td colspan="2" class="section">предоплата</td>
            <td class="num value">${money(order.prepaymentAmount)}</td>
          </tr>
          <tr>
            <td colspan="10" class="blank"></td>
            <td colspan="2" class="section">S общ.</td>
            <td class="blank"></td>
            <td class="blank"></td>
          </tr>
          <tr>
            <td class="blank"></td>
            <td class="blank"></td>
            <td class="blank"></td>
            <td colspan="6" class="value">${textValue(order.jointingNote ?? "")}</td>
            <td class="section">м²</td>
            <td colspan="2" class="num value">${formatArea(order.totalAreaM2)}</td>
            <td class="section">ИТОГО</td>
            <td class="num value">${money(order.totalAmount)}</td>
          </tr>

          <tr>
            <th rowspan="2"></th>
            <th colspan="2">размер</th>
            <th rowspan="2">кол. шт.</th>
            <th colspan="5" rowspan="2">примечание</th>
            <th rowspan="2">цена за м²</th>
            <th colspan="2">м²</th>
            <th colspan="2">стоимость</th>
          </tr>
          <tr>
            <th>высота</th>
            <th>ширина</th>
            <th>1 ед</th>
            <th>общая</th>
            <th>1 ед</th>
            <th>общая</th>
          </tr>
          ${renderLineRows(visibleLines)}
          <tr>
            <td colspan="3" class="blank"></td>
            <td class="quantity-total">${numberValue(quantityTotal, 3)}</td>
            <td colspan="9" class="blank"></td>
            <td class="center">-</td>
          </tr>
          <tr class="warning-row">
            <td colspan="8" class="blank"></td>
            <td colspan="6" class="warning">
              ПРОВЕРЯЙТЕ ПРАВИЛЬНОСТЬ ВНЕСЕННЫХ ДАННЫХ В СПЕЦИФИКАЦИИ<br />
              ПРЕТЕНЗИИ ПОСЛЕ ОПЛАТЫ ИЛИ ПОДТВЕРЖДЕНИЯ НЕ ПРИНИМАЮТСЯ
            </td>
          </tr>
          <tr class="sign">
            <td colspan="2" class="blank"></td>
            <td colspan="4">Исполнитель ____________________</td>
            <td colspan="2" class="blank"></td>
            <td colspan="4">Заказчик ____________________</td>
            <td colspan="2" class="signature-name">${textValue(order.customer.name)}</td>
          </tr>
          <tr>
            <td colspan="14" class="footer-details">
              <div class="footer-layout">
                <div class="footer-company">
                  <div class="footer-company-grid">
                    <div>Общество с ограниченной ответственностью "ФАСАД ЛЮКС"</div>
                    <div>Расчетный счет: 40702810636060000012</div>
                    <div>ИНН: 7811641022</div>
                    <div>Банк: ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)</div>
                    <div>КПП: 781101001</div>
                    <div>БИК: 044525411</div>
                    <div>ОГРН: 1177847089342</div>
                    <div>Корр. счет: 30101810145250000411</div>
                    <div>Юридический адрес: 192148, Санкт-Петербург, г, Крупской ул, дом 43, литер А, помещение 3С</div>
                    <div>Тел.: +7 (812) 336 43 03</div>
                  </div>
                </div>
                ${renderCustomerFooter(order)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  </body>
</html>`;
}
