package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type PaymentSetting struct {
	AmountOptions   []int           `json:"amount_options"`
	AmountDiscount  map[int]float64 `json:"amount_discount"`   // 充值金额对应的折扣，例如 100 元 0.9 表示 100 元充值享受 9 折优惠
	ShowBankAccount bool            `json:"show_bank_account"` // 是否在钱包管理页面展示对公银行卡信息
	BankAccountName string          `json:"bank_account_name"` // 对公银行卡账户名称
	BankName        string          `json:"bank_name"`         // 开户银行
	BankAccount     string          `json:"bank_account"`      // 对公银行卡账号
}

// 默认配置
var paymentSetting = PaymentSetting{
	AmountOptions:   []int{10, 20, 50, 100, 200, 500},
	AmountDiscount:  map[int]float64{},
	ShowBankAccount: false,
	BankAccountName: "",
	BankName:        "",
	BankAccount:     "",
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("payment_setting", &paymentSetting)
}

func GetPaymentSetting() *PaymentSetting {
	return &paymentSetting
}
