'use strict';

let selfUserId			= '';
let sendUserId			= '';
let userNameList		= {};

$(function() {
	$('#confirm_wrapper').css({
		'top'	: 'calc(50% - (' + $('#confirm_wrapper').innerHeight() + 'px / 2))',
		'left'	: 'calc(50% - (' + $('#confirm_wrapper').innerWidth() + 'px / 2))',
	});
	
	getSelfData()
	.then(generateSendUserOptionHtml)
	.done(generateSendChannelOptionHtml)
	.done(generateSendHistoryHtml)
	.always(function() {
		$('.modal-loading').fadeOut();
		$('main').css('margin-top', $('header').outerHeight(true) + 'px');
	});

	$('#send_user_list').on('click', 'li', function() {
		$('#send_user_name').val($(this).text()).trigger('blur');
	});
	
	$('#send_user_name').on('focus', function() {
		$(this).trigger('input');
	});
	$('#send_user_name').on('blur', function() {
		const $ELM = $(this);
		sendUserId = '';
		$('#send_user_list li').each(function() {
			if ($(this).text() === $ELM.val()) {
				sendUserId = $(this).data('id');
				$ELM.removeClass('error');
				return false;
			}
		});
		
		switch_exec_button_enabled();
		setTimeout(function() {
			if (sendUserId === '') {
				$ELM.addClass('error');
			}
			$('#send_user_list').hide();
		}, 200);
	});
	$('#send_user_name').on('input', function() {
		const INPUT_VALUE = $(this).val();
		if (INPUT_VALUE === '') {
			$('#send_user_list').hide();
			return;
		}
		
		let is_list_show = false;
		$('#send_user_list li').hide();
		$('#send_user_list li').each(function() {
			if ($(this).text().indexOf(INPUT_VALUE) > -1) {
				$(this).show();
				is_list_show = true;
			}
		});
		if (is_list_show === true) {
			$('#send_user_list').show();
		} else {
			$('#send_user_list').hide();
		}
	});
	
	$('#send_comment').on('blur', function() {
		$(this).removeClass('error');
		if ($(this).val() === '') {
			$(this).addClass('error');
		}
	});

	$('#send_comment').on('change', function() {
		switch_exec_button_enabled();
	});
	
	$('#exec_send_nc').on('click', function() {
		$('#confirm_send_user_name').text($('#send_user_list li[data-id="' + sendUserId + '"]').data('name'));
		$('#confirm_send_nc').text($('input[name="send_nc"]:checked').val());
		$('#confirm_send_channel').text($('#send_channel option:checked').text());
		
		$('#modal_background-confirm').fadeIn();
		$('#confirm_exec_send_nc').show();
		$('#confirm_wrapper').show().css({
			'top'	: 'calc(50% - (' + $('#confirm_wrapper').innerHeight() + 'px / 2))',
			'left'	: 'calc(50% - (' + $('#confirm_wrapper').innerWidth() + 'px / 2))',
		});
		$('#confirm_wrapper').hide().fadeIn();
	});
	
	$('#confirm_exec_send_nc-ng, #modal_background-confirm').on('click', function() {
		if ($('#confirm_exec_send_nc').is(':visible') === true) {
			$('.modal-confirm').fadeOut();
		}
	});
	
	$('#confirm_exec_send_nc-ok').on('click', function() {
		$('#confirm_exec_send_nc-ng').trigger('click');

		$.ajax({
			'url'		: '/api/send_nc',
			'dataType'	: 'json',
			'type'		: 'post',
			'data'		: {
				'send_user_id'	: sendUserId,
				'send_nc'		: $('input[name="send_nc"]:checked').val(),
				'send_channel'	: $('#send_channel').val(),
				'send_comment'	: $('#send_comment').val(),
			}
		}).done(function(res) {
			if (res['result'] === true) {
				generateSendHistoryHtml();
				alert('NCをプレゼントしました。\n最終結果はSlackを確認してください。');
			} else {
				alert('NCをプレゼントできませんでした。');
			}
		}).fail(function(jqXHR, textStatus, errorThrown) {
			console.log(jqXHR, textStatus, errorThrown);
			alert('NCのプレゼントに失敗しました。');
		});
	});
	
	let resizing = false;
	$(window).on('resize', function() {
		if (resizing === true) {
			return;
		}
		resizing = true;
		setTimeout(function() {
			setHistoryListMaxHeight();
			resizing = false;
		}, 50);
	})
});

/**
 * 自ユーザ情報取得
 */
function getSelfData() {
	let d = new $.Deferred;
	
	$.ajax({
		'url'		: '/api/get_self_data',
		'dataType'	: 'json',
	}).done(function(res) {
		selfUserId = res['id'];
		$('#self_user_name').text(res['name']);
		$('#self_user_name_wrapper').css('visibility', 'visible');
		$('#modal_background-confirm, #confirm_wrapper, #required_login').hide();
		$('#send_nc_form').find('input, select, textarea').prop('disabled', false);
		d.resolve();
	}).fail(function(jqXHR, textStatus, errorThrown) {
		console.log(jqXHR, textStatus, errorThrown);
		d.reject('Error: get_self_data');
	});
	
	return d.promise();
}

/**
 * 送り先プルダウンHTML生成
 */
function generateSendUserOptionHtml() {
	let d = new $.Deferred;
	
	$.ajax({
		'url'		: '/api/get_user_list',
		'dataType'	: 'json',
	}).done(function(res) {
		userNameList = res;
		$.each(res, function(userId, userNameData) {
			if (userId !== selfUserId) {
				let optionUserName	= userNameData['realName'];
				let viewUserName	= userNameData['realName'];
				if (userNameData['displayName'] !== '') {
					optionUserName	= userNameData['displayName'] + '(' + optionUserName + ')';
					viewUserName	= userNameData['displayName'];
				}
				$('#send_user_list').append('<li data-id="' + userId + '" data-name="' + viewUserName + '">' + optionUserName + '</li>');
			}
		});
		d.resolve();
	}).fail(function(jqXHR, textStatus, errorThrown) {
		console.log(jqXHR, textStatus, errorThrown);
		d.reject('Error: get_user_list');
	});
	
	return d.promise();
}

/**
 * チャンネルプルダウンHTML生成
 */
function generateSendChannelOptionHtml() {
	let d = new $.Deferred;
	
	$.ajax({
		'url'		: '/api/get_channel_list',
		'dataType'	: 'json',
	}).done(function(res) {
		let defaultId = '';
		$.each(res, function(channelId, channelData) {
			$('#send_channel').append('<option value="' + channelId + '">' + channelData['name'] + '</option>');
			if (channelData['default'] === true) {
				defaultId = channelId;
			}
		});
		$('#send_channel').val(defaultId);
		d.resolve();
	}).fail(function(jqXHR, textStatus, errorThrown) {
		console.log(jqXHR, textStatus, errorThrown);
		d.reject('Error: get_channel_list');
	});
	
	return d.promise();
}

/**
 * 送信履歴HTML生成
 */
function generateSendHistoryHtml() {
	let d = new $.Deferred;
	$('#loading_send_nc_history').show();
	$('#send_nc_history').hide();
	
	$.ajax({
		'url'		: '/api/get_self_monthly_log',
		'dataType'	: 'json',
	}).done(function(res) {
		$('.send_nc_history_row').remove();
		if (res.length === 0) {
			$('#total_send_nc_wrapper, #send_nc_history_header').hide();
			$('#send_nc_history_no_data').show();
			d.resolve();
			return;
		}

		let totalNC = 0;
		$.each(res, function(i, sendData) {
			totalNC += sendData['nc'];
			const SEND_DATE_OBJ = new Date(sendData['ts'] * 1000);
			const VIEW_SEND_DATE = paddingValue(SEND_DATE_OBJ.getMonth() + 1, 0, 2) + '/' + paddingValue(SEND_DATE_OBJ.getDate(), 0, 2) + ' ' + paddingValue(SEND_DATE_OBJ.getHours(), 0, 2) + ':' + paddingValue(SEND_DATE_OBJ.getMinutes(), 0, 2);
			let viewUserName	= '-';
			let propUserName	= '';
			if (typeof userNameList[sendData['userId']] !== 'undefined') {
				viewUserName	= userNameList[sendData['userId']]['realName'];
				if (userNameList[sendData['userId']]['displayName'] !== '') {
					viewUserName	= userNameList[sendData['userId']]['displayName'];
					propUserName	= ' title="' + userNameList[sendData['userId']]['realName'] + '"';
				}
			}
			$('#send_nc_history_list').append('<div class="send_nc_history_row"><div>' + VIEW_SEND_DATE + '</div><div>' + sendData['channel'] + '</div><div' + propUserName + '>' + viewUserName + '</div><div>' + sendData['nc'] + '</div><div>' + sendData['text'].replace('/\n/g', '<br>') + '</div></div>');
		});

		$('#total_send_nc').text(totalNC);
		$('#send_nc_history_header').css('display', 'flex');
		$('#total_send_nc_wrapper, #send_nc_history').show();
		setHistoryListMaxHeight();
		$('#send_nc_history_no_data, #send_nc_history').hide();

		d.resolve();
	}).fail(function(jqXHR, textStatus, errorThrown) {
		console.log(jqXHR, textStatus, errorThrown);
		$('#total_send_nc_wrapper, #send_nc_history_header').hide();
		$('#send_nc_history_no_data').show();
		d.reject('Error: get_self_monthly_log');
	}).always(function() {
		$('#loading_send_nc_history').hide();
		$('#send_nc_history').fadeIn();
	});
	
	return d.promise();
}

function setHistoryListMaxHeight() {
	$('#send_nc_history_list').css('max-height', 'calc(100vh - ' + $('#send_nc_history_list').offset()['top'] + 'px - ' + $('#send_nc_history_section').css('margin-bottom') + ')');
}

/**
 * 指定値でパディング
 *
 * @param {string} originalValue パディング対象文字
 * @param {string} paddingStr パディング文字
 * @param {int} len 文字数
 * @return {string} パディング後の値
 */
function paddingValue(originalValue, paddingStr, len) {
	originalValue = originalValue.toString();
	while (originalValue.length < len) {
		originalValue = paddingStr + originalValue;
	}
	return originalValue;
}

/**
 * プレゼント実行ボタンの活性切り替え
 */
function switch_exec_button_enabled() {
	if (sendUserId !== '' && $('input[name="send_nc"]:checked').length > 0 && $('#send_channel').val() !== '' && $('#send_comment').val() !== '') {
		$('#exec_send_nc').prop('disabled', false).removeClass('disabled');
	} else {
		$('#exec_send_nc').prop('disabled', true).addClass('disabled');
	}
}